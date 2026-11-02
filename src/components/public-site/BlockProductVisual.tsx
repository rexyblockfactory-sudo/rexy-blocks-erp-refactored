import React from "react";

type BlockProduct = { name: string; category?: string | null; size?: string | null };

export function blockVariant(product: BlockProduct) {
  const text = `${product.name} ${product.category ?? ""} ${product.size ?? ""}`.toLowerCase();
  const size = /(^|\\D)5(\\s|-)?inch|five\\s?inch/.test(text) ? "5-inch" : /(^|\\D)6(\\s|-)?inch|six\\s?inch/.test(text) ? "6-inch" : "";
  const hollow = /hollow/.test(text);
  const solid = /solid/.test(text);
  return { size, type: hollow ? "hollow" : solid ? "solid" : "block" };
}

export default function BlockProductVisual({ product, className = "" }: { product: BlockProduct; className?: string }) {
  const variant = blockVariant(product);
  const depth = variant.size === "6-inch" ? 74 : 62;
  const frontY = 112;
  return (
    <div className={`relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#f0f0e9] via-[#e2e4dc] to-[#d2d7ce] p-3 ${className}`} role="img" aria-label={`${product.name} concrete block product illustration`}>
      <svg viewBox="0 0 420 280" className="h-full w-full drop-shadow-[0_18px_12px_rgba(31,43,34,0.18)]" aria-hidden="true">
        <defs>
          <linearGradient id="blockFront" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c9cbc3"/><stop offset="1" stopColor="#aeb3aa"/></linearGradient>
          <linearGradient id="blockTop" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e0e1d9"/><stop offset="1" stopColor="#bfc4bb"/></linearGradient>
          <linearGradient id="blockSide" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#aeb4aa"/><stop offset="1" stopColor="#8e988d"/></linearGradient>
          <pattern id="concreteGrain" width="17" height="17" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r="1" fill="#747d73" opacity=".16"/><circle cx="12" cy="11" r=".8" fill="#fff" opacity=".28"/><circle cx="7" cy="15" r=".7" fill="#747d73" opacity=".13"/></pattern>
        </defs>
        <ellipse cx="210" cy="226" rx="154" ry="19" fill="#657166" opacity=".18"/>
        <path d={`M72 ${frontY} L286 ${frontY-35} L354 ${frontY-2} L140 ${frontY+34} Z`} fill="url(#blockTop)" stroke="#929a90" strokeWidth="3"/>
        <path d={`M286 ${frontY-35} L354 ${frontY-2} L354 ${frontY+depth} L286 ${frontY+depth-34} Z`} fill="url(#blockSide)" stroke="#899388" strokeWidth="3"/>
        <path d={`M72 ${frontY} L286 ${frontY-35} L286 ${frontY+depth-34} L72 ${frontY+depth} Z`} fill="url(#blockFront)" stroke="#929a90" strokeWidth="3"/>
        <path d={`M72 ${frontY} L286 ${frontY-35} L354 ${frontY-2} L140 ${frontY+34} Z`} fill="url(#concreteGrain)"/>
        <path d={`M72 ${frontY} L286 ${frontY-35} L286 ${frontY+depth-34} L72 ${frontY+depth} Z`} fill="url(#concreteGrain)"/>
        <path d={`M286 ${frontY-35} L354 ${frontY-2} L354 ${frontY+depth} L286 ${frontY+depth-34} Z`} fill="url(#concreteGrain)"/>
        {variant.type === "hollow" ? <>
          <path d="M112 106 L169 97 L194 109 L137 119 Z" fill="#747d73" stroke="#899187" strokeWidth="2"/>
          <path d="M137 119 L194 109 L194 151 L137 161 Z" fill="#687267" opacity=".8"/>
          <path d="M202 91 L258 82 L281 94 L225 104 Z" fill="#747d73" stroke="#899187" strokeWidth="2"/>
          <path d="M225 104 L281 94 L281 137 L225 147 Z" fill="#687267" opacity=".8"/>
          <path d="M112 106 L137 119 L137 161 L112 148 Z" fill="#aab0a6"/>
          <path d="M202 91 L225 104 L225 147 L202 134 Z" fill="#aab0a6"/>
        </> : <path d="M91 133 L275 102" stroke="#f3f3ed" strokeWidth="2" opacity=".3"/>}
        <path d={`M72 ${frontY} L286 ${frontY-35}`} stroke="#f7f7f1" strokeWidth="3" opacity=".7"/>
      </svg>
      <span className="absolute bottom-3 left-3 rounded-full border border-white/70 bg-white/85 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#526052]">{variant.size || "Concrete"} · {variant.type}</span>
    </div>
  );
}
