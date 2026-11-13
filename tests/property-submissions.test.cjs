/* eslint-disable @typescript-eslint/no-require-imports -- Uses the existing node:test harness. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { PGlite } = require("@electric-sql/pglite");
const root = join(__dirname, "..");
const migration = readFileSync(join(root,"supabase/migrations/20261113120932_add_private_property_submissions.sql"),"utf8");
const source = readFileSync(join(root,"src/lib/property-submission-input.ts"),"utf8");
const exports_ = {};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:exports_});
const parse=exports_.parsePropertySubmission;

function form(market="stay") {
  const data=new FormData();
  for (const [name,value] of Object.entries({
    market,title:"Furnished test apartment",contact_name:"Test Reviewer",contact_phone:"+233 50 000 0000",
    city:"Kumasi",region:"Ashanti",description:"A fixture for testing private property submissions.",
    construction_status:"completed",price_ghs:"150.50",bedrooms:"2",bathrooms:"1",
    max_guests:"4",authority:"yes",consent:"yes",
  })) data.set(name,value);
  return data;
}

test("intake validates all three markets and never accepts publication or review fields",()=>{
  for(const market of ["sale","rent","stay"]){
    const f=form(market);
    f.set("status","published");
    f.set("verified_by","pretend");
    const v=parse(f);
    assert.equal(v.property_data.market,market);
    assert.equal(v.property_data.price_ghs,150.5);
    assert.equal(v.property_data.max_guests,market==="stay"?4:null);
    assert.equal(v.property_data.contact_phone,undefined);
    assert.equal(v.property_data.status,undefined);
    assert.equal(v.property_data.verified_by,undefined);
  }
});

test("intake rejects missing authority, invalid prices and guests, and oversized or unsupported files",()=>{
  for(const [name,value] of [["authority","no"],["consent","no"],["price_ghs","-5"],["max_guests",""],["contact_phone","hello world"]]){
    const f=form();f.set(name,value);
    assert.throws(()=>parse(f));
  }
  for(const photo of [new File([new Uint8Array(3_800_001)],"big.png",{type:"image/png"}),new File(["invalid"],"x.svg",{type:"image/svg+xml"})]){
    const f=form();f.append("photos",photo);
    assert.throws(()=>parse(f));
  }
});

test("property intake is private and only makes one unpublished draft per accepted submission",async()=>{
  const db=new PGlite();
  const admin="00000000-0000-0000-0000-000000000001";
  const manager="00000000-0000-0000-0000-000000000002";
  const owner="00000000-0000-0000-0000-000000000003";
  const first="00000000-0000-0000-0000-000000000011";
  const rejected="00000000-0000-0000-0000-000000000012";
  try{
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      create schema auth;
      create schema storage;
      create table auth.users (id uuid primary key);
      create table public.profiles (id uuid primary key,role text);
      create table storage.buckets (id text primary key,name text,public boolean,file_size_limit int,allowed_mime_types text[]);
      create table public.property_listings(
        id uuid primary key,slug text unique,market text,status text,title text,description text,
        city text,region text,neighborhood text,construction_status text,price_ghs numeric,
        bedrooms int,bathrooms int,max_guests int,photo_urls text[]
      );
      grant select on public.profiles to service_role;
      grant select,insert on public.property_listings to service_role;
      grant select on public.property_listings to anon,authenticated;
      alter table public.property_listings enable row level security;
      create policy published_only on public.property_listings for select to anon,authenticated using(status='published');
      insert into auth.users values ('${admin}'),('${manager}'),('${owner}');
      insert into public.profiles values ('${admin}','admin'),('${manager}','manager'),('${owner}','project_owner');
      alter default privileges in schema public grant all on tables to anon,authenticated;
      alter default privileges in schema public grant execute on functions to anon,authenticated;
    `);
    await db.exec(migration);
    const rows=async(sql,args)=>(await db.query(sql,args)).rows;
    const role=async(value)=>db.exec("reset role; set role "+value);
    const draft=(id,by)=>rows("select public.create_listing_from_property_submission($1,$2) as id",[id,by]);
    const payload=JSON.stringify(parse(form()).property_data);
    await role("service_role");
    for(const id of [first,rejected])await rows("insert into public.property_submissions(id,contact_name,contact_phone,property_data,photo_paths) values($1,'Fixture Owner','0500000000',$2::jsonb,$3::text[])",[id,payload,[id+"/0.webp"]]);
    await rows("update public.property_submissions set status='rejected' where id=$1",[rejected]);
    await assert.rejects(draft(first,owner),/staff access required/);
    await assert.rejects(draft(rejected,admin),/no longer available/);
    const id=(await draft(first,manager))[0].id;
    assert.equal((await draft(first,admin))[0].id,id);
    assert.deepEqual(await rows("select status,photo_urls from public.property_listings"),[{status:"draft",photo_urls:["/api/property-listing-media/"+id+"/0"]}]);
    assert.deepEqual(await rows("select status,listing_id from public.property_submissions where id=$1",[first]),[{status:"draft_created",listing_id:id}]);
    for(let i=0;i<8;i++)assert.equal((await rows("select public.consume_property_submission_limit($1) as ok",["a".repeat(64)]))[0].ok,true);
    assert.equal((await rows("select public.consume_property_submission_limit($1) as ok",["a".repeat(64)]))[0].ok,false);
    for(const untrusted of ["anon","authenticated"]){
      await role(untrusted);
      await assert.rejects(rows("select * from public.property_submissions"),/permission denied/);
      await assert.rejects(draft(first,admin),/permission denied/);
      assert.deepEqual(await rows("select * from public.property_listings"),[]);
    }
    await db.exec("reset role");
    assert.deepEqual(await rows("select public from storage.buckets where id='property-submission-photos'"),[{public:false}]);
  }finally{await db.close();}
});
