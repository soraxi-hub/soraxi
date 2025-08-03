"use client";

import { usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Suspense, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Button } from "./ui/button";
import { useQueryState } from "nuqs";
import debounce from "debounce";

function SearchBar() {
  const [search, setSearch] = useQueryState("search");
  const pathname = usePathname();

  const displaySearchInput = pathname.startsWith("/");

  const [query, setQuery] = useState(search ?? "");

  // Memoized debounced setter to avoid recreating on every render
  const debouncedSetSearch = useMemo(
    () =>
      debounce((val: string) => {
        if (val) {
          setSearch(val);
        } else {
          setSearch(null);
        }
      }, 3000),
    [setSearch]
  );

  useEffect(() => {
    debouncedSetSearch(query);
  }, [query, debouncedSetSearch]);

  return (
    <Suspense fallback={`search`}>
      <div>
        {displaySearchInput && (
          <form onSubmit={(e) => e.preventDefault()} className="relative flex">
            <Button className="absolute h-9 w-9 left-0 bg-transparent rounded-l-xs rounded-r p-0 hover:bg-transparent">
              <div className="flex justify-center items-center">
                <Image
                  src={"/svg/search-gray.svg"}
                  height={20}
                  width={20}
                  alt={"search-icon"}
                />
              </div>
            </Button>
            <Input
              id="search"
              name="search"
              type="search"
              autoComplete="off"
              placeholder="Search products..."
              className="h-9 pl-10 md:w-[370px] lg:w-[580px] delay-75 transition-all ease-in-out focus:!ring-soraxi-darkmode-success focus:!outline-none focus:!ring-1 focus:border-transparent"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </form>
        )}
      </div>
    </Suspense>
  );
}

export default SearchBar;
