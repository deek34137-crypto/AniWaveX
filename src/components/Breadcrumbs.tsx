import React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { JsonLd, createBreadcrumbSchema } from "@/lib/seo/jsonld";

export interface BreadcrumbItem {
  name: string;
  path: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  const fullItems: BreadcrumbItem[] = [
    { name: "Home", path: "/" },
    ...items,
  ];

  return (
    <>
      <JsonLd schema={createBreadcrumbSchema(fullItems)} />
      <nav aria-label="Breadcrumb" className={`flex items-center text-xs text-slate-400 ${className}`}>
        <ol className="flex items-center flex-wrap gap-1.5 list-none m-0 p-0">
          {fullItems.map((item, index) => {
            const isLast = index === fullItems.length - 1;

            return (
              <li key={item.path} className="flex items-center gap-1.5">
                {index > 0 && (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0 select-none" aria-hidden="true" />
                )}

                {isLast ? (
                  <span
                    aria-current="page"
                    className="font-semibold text-slate-200 truncate max-w-[200px] sm:max-w-[320px]"
                  >
                    {item.name}
                  </span>
                ) : (
                  <Link
                    href={item.path}
                    className="hover:text-cyan-400 transition-colors flex items-center gap-1 font-medium text-slate-400"
                  >
                    {index === 0 && <Home className="w-3 h-3 text-slate-400 select-none" aria-hidden="true" />}
                    <span>{item.name}</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
