/* eslint-disable @typescript-eslint/no-require-imports -- Uses the existing CommonJS node:test harness. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { PGlite } = require("@electric-sql/pglite");

const root = join(__dirname, "..");
const a = "00000000-0000-0000-0000-000000000001";
const b = "00000000-0000-0000-0000-000000000002";
const staff = "00000000-0000-0000-0000-000000000003";
const p1 = "10000000-0000-0000-0000-000000000001";
const p2 = "10000000-0000-0000-0000-000000000002";

function load(path, imports = {}, env = {}) {
  const source = readFileSync(join(root, path), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, URLSearchParams, process: { env }, require: name => {
    if (!(name in imports)) throw new Error(`Unexpected import: ${name}`);
    return imports[name];
  } });
  return exports;
}

test("database enrollment and restrictive ERP policies isolate two owner identities", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      create schema auth;
      create function auth.uid() returns uuid language sql as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      grant usage on schema auth to authenticated, anon;
      create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
      create table public.profiles (id uuid primary key references auth.users, email text, full_name text, role text default 'operator');
      alter table public.profiles enable row level security;
      grant select, update on public.profiles to authenticated;
      create policy own_profile on public.profiles for select to authenticated using (id = auth.uid());
      create function public.handle_new_user() returns trigger language plpgsql security definer as $$
        begin
          insert into public.profiles values(new.id,new.email,'','operator');
          return new;
        end;
      $$;
      create trigger on_auth_user_created after insert on auth.users
        for each row execute function public.handle_new_user();
      create table public.inventory (quantity int);
      insert into public.inventory values (42);
      alter table public.inventory enable row level security;
      grant all on public.inventory to public, anon, authenticated;
      create policy legacy_inventory on public.inventory to public using (true) with check (true);
      create table public.products (name text);
      insert into public.products values ('Public block');
      alter table public.products enable row level security;
      grant all on public.products to authenticated, anon;
      create policy products_public_read on public.products for select using (true);
      create policy products_legacy_write on public.products for update using (true) with check (true);
      create table public.property_listings (name text);
      create table public.website_order_requests (customer_name text);
      alter table public.website_order_requests enable row level security;
      grant insert (customer_name) on public.website_order_requests to anon;
      create policy public_order on public.website_order_requests for insert to anon with check (true);
      create table public.client_projects(id uuid primary key);
      create table public.client_project_members (
        project_id uuid references public.client_projects, user_id uuid references auth.users,
        added_by uuid references auth.users, primary key(project_id,user_id)
      );
      grant select on public.client_project_members to service_role;
      create function public.record_inventory_movement() returns int
      language plpgsql security definer as $$
      DECLARE n int;
      BEGIN
        select quantity into n from public.inventory;
        return n;
      END;
      $$;
      grant execute on function public.record_inventory_movement() to authenticated, anon;
      insert into auth.users values ('${staff}','staff@example.invalid','{}');
      update public.profiles set role='admin' where id='${staff}';
      insert into public.client_projects values ('${p1}'),('${p2}');
    `);
    await db.exec(readFileSync(join(root, "supabase/migrations/20261113063352_isolate_project_owners_from_erp.sql"), "utf8"));
    await db.exec(`
      insert into auth.users values ('${a}','owner-a@example.invalid','{"role":"admin"}'),
        ('${b}','owner-b@example.invalid','{"role":"operator"}');
    `);
    const rows = async (sql, args) => (await db.query(sql, args)).rows;
    const assume = async (role, id = "") => {
      await db.exec(`reset role; set role ${role}`);
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    };
    const enroll = (project, user, email, admin = staff) =>
      rows("select public.enroll_rexy_project_owner($1,$2,$3,$4)", [project,user,email,admin]);

    assert.deepEqual((await rows("select role from profiles where id <> $1 order by id", [staff])).map(x=>x.role),
      ["unassigned", "unassigned"]);
    await assume("service_role");
    await assert.rejects(enroll(p1,a,"owner-b@example.invalid"), /matching non-staff/);
    await assert.rejects(enroll(p1,staff,"staff@example.invalid"), /matching non-staff/);
    await assert.rejects(enroll(p1,a,"owner-a@example.invalid",a), /Administrator access required/);
    await assert.rejects(enroll(staff,a,"owner-a@example.invalid"), /foreign key/);
    await assume("authenticated", a);
    assert.deepEqual(await rows("select role from public.profiles"), [{ role: "unassigned" }]);
    await assert.rejects(enroll(p1,a,"owner-a@example.invalid"), /permission denied/);

    await assume("service_role");
    await enroll(p1,a,"OWNER-A@example.invalid");
    await enroll(p2,b,"owner-b@example.invalid");
    await enroll(p1,a,"owner-a@example.invalid");
    assert.deepEqual(await rows("select project_id,user_id from public.client_project_members order by project_id"), [
      { project_id:p1,user_id:a }, { project_id:p2,user_id:b },
    ]);
    for (const owner of [a,b]) {
      await assume("authenticated", owner);
      assert.deepEqual(await rows("select role from public.profiles"), [{role:"project_owner"}]);
      assert.deepEqual(await rows("update public.profiles set role='operator' returning role"), []);
      assert.deepEqual(await rows("select * from public.inventory"), []);
      assert.deepEqual(await rows("update public.inventory set quantity=1 returning quantity"), []);
      assert.deepEqual(await rows("update public.products set name='not allowed' returning name"), []);
      assert.deepEqual(await rows("select name from public.products"), [{name:"Public block"}]);
      await assert.rejects(rows("select public.record_inventory_movement()"), /ERP staff access required/);
      await assert.rejects(rows("select * from public.client_project_members"), /permission denied/);
    }
    await assume("anon");
    await assert.rejects(rows("select * from public.inventory"), /permission denied/);
    await assert.rejects(rows("select public.record_inventory_movement()"), /permission denied/);
    await rows("insert into public.website_order_requests(customer_name) values ('public fixture')");
    assert.deepEqual(await rows("select name from public.products"), [{name:"Public block"}]);
    await assume("authenticated", staff);
    assert.deepEqual(await rows("select quantity from public.inventory"), [{quantity:42}]);
    assert.deepEqual(await rows("select public.record_inventory_movement() as quantity"), [{quantity:42}]);
    await db.exec("reset role");
    await assert.rejects(rows("update public.profiles set role='operator' where id=$1", [a]), /separate staff account/);
  } finally {
    await db.close();
  }
});

test("each owner sees only their assigned project and never receives the other owner's photo link", async () => {
  const memberships = [{user_id:a,project_id:p1},{user_id:b,project_id:p2}];
  const fixtures = {
    client_project_members: memberships,
    client_projects: [{id:p1,name:"Owner A"},{id:p2,name:"Owner B"}],
    client_project_milestones: [],
    client_project_updates: [{project_id:p1,is_visible:false,heading:"Hidden report"}],
    client_project_photos: [{project_id:p1,storage_path:"a/private.jpg"},{project_id:p2,storage_path:"b/private.jpg"}],
  };
  const signed = [];
  const projectReads = [];
  let activeUser = a;
  let activeRole = "project_owner";
  function query(table, input) {
    let result = input;
    const q = {
      select: () => q, eq: (key,value) => { result = result.filter(row=>row[key]===value); return q; },
      in: (key,values) => { result = result.filter(row=>values.includes(row[key])); return q; },
      limit: () => q, order: () => q,
      maybeSingle: async () => ({data:result[0]??null,error:null}),
      then: resolve => resolve({data:result,error:null}),
    };
    if (table === "client_projects") projectReads.push(table);
    return q;
  }
  const api = load("src/lib/client-projects.ts", {
    "server-only":{}, react:{ cache: fn=>fn },
    "@/lib/supabase/server":{ createSupabaseServerClient: async () => ({
      auth:{getUser:async()=>({data:{user:{id:activeUser}},error:null})},
      from: table=>query(table,[{id:activeUser,role:activeRole}]),
    }) },
    "@/lib/supabase/admin":{supabaseAdmin:{
      from: table=>query(table,fixtures[table]),
      storage:{from:bucket=>({createSignedUrl:async(path,seconds)=>{
        assert.equal(bucket,"client-project-media");
        assert.equal(seconds,300);
        signed.push(path);
        return {data:{signedUrl:"https://example.invalid/"+path}};
      }})},
    }},
  });
  for (const [owner, own, other] of [[a,p1,p2],[b,p2,p1]]) {
    activeUser=owner;
    assert.equal(await api.getSignedInProjectOwnerId(),owner);
    assert.equal((await api.loadOwnerProjects(owner)).map(x=>x.id).join(","),own);
    const readsBefore=projectReads.length;
    const photosBefore=signed.length;
    assert.equal(await api.loadOwnerProject(owner,other),null);
    assert.equal(projectReads.length,readsBefore);
    assert.equal(signed.length,photosBefore);
    const detail=await api.loadOwnerProject(owner,own);
    assert.equal(detail.project.id,own);
    assert.equal(detail.updates.length,0);
    assert.equal(detail.photos.length,1);
  }
  assert.deepEqual(signed,["a/private.jpg","b/private.jpg"]);
  memberships.shift();
  assert.equal(await api.loadOwnerProject(a,p1),null);
  activeRole="operator";
  assert.equal(await api.getSignedInProjectOwnerId(),null);
});

test("invite targets use the exact production or protected preview callback", () => {
  const path="src/lib/project-invite.ts";
  assert.equal(load(path).projectInviteRedirect(),"https://rexyblockfactory.com/project-accept-invite");
  assert.equal(load(path,{}, {VERCEL_ENV:"preview",VERCEL_URL:"rexy-preview.vercel.app"}).projectInviteRedirect(),
    "https://rexy-preview.vercel.app/project-accept-invite");
  assert.equal(load(path,{}, {VERCEL_ENV:"preview",VERCEL_URL:"rexy-preview.vercel.app.example.invalid"}).projectInviteRedirect(),
    "https://rexyblockfactory.com/project-accept-invite");
  const { readProjectInviteFragment }=load("src/lib/project-invite-session.ts");
  assert.equal(readProjectInviteFragment("#type=invite&access_token=fixture-access&refresh_token=fixture-refresh").access_token,
    "fixture-access");
  assert.equal(readProjectInviteFragment("#type=invite&access_token=fixture-access"),null);
  assert.equal(readProjectInviteFragment("#type=recovery&access_token=fixture-access&refresh_token=fixture-refresh"),null);
});
