"use client";

import { usePathname, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Suspense, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Button } from "./ui/button";
import { useQueryState } from "nuqs";
import debounce from "debounce";

function SearchBar() {
  const [search, setSearch] = useQueryState("search");
  const pathname = usePathname();
  const router = useRouter();

  const displaySearchInput = pathname.startsWith("/");

  /**
   * The home page has no results grid worth staying on, so a search there is a
   * request to go somewhere — `/products`, which owns filtering, sorting and
   * pagination. Everywhere else (a category listing, `/products` itself) the
   * query refines what is already on screen, so it stays in place.
   */
  const redirectsToAllProducts = pathname === "/";

  const [query, setQuery] = useState(search ?? "");

  // Memoized debounced setter to avoid recreating on every render
  const debouncedSetSearch = useMemo(
    () =>
      debounce((val: string) => {
        if (redirectsToAllProducts) {
          // Nothing to navigate to on an empty query — that would drop the
          // visitor on an unfiltered catalogue they did not ask for.
          if (val) {
            router.push(`/products?search=${encodeURIComponent(val)}`);
          }
          return;
        }

        if (val) {
          setSearch(val);
        } else {
          setSearch(null);
        }
      }, 3000),
    [setSearch, redirectsToAllProducts, router],
  );

  useEffect(() => {
    debouncedSetSearch(query);
  }, [query, debouncedSetSearch]);

  /** Enter should not wait out the debounce. */
  const submit = () => {
    const value = query.trim();
    debouncedSetSearch.clear();

    if (redirectsToAllProducts) {
      if (value) router.push(`/products?search=${encodeURIComponent(value)}`);
      return;
    }

    setSearch(value || null);
  };

  return (
    <Suspense fallback={`search`}>
      <div>
        {displaySearchInput && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="relative flex"
          >
            <Button
              type="submit"
              aria-label="Search"
              className="absolute h-9 w-9 left-0 bg-transparent rounded-l-xs rounded-r p-0 hover:bg-transparent"
            >
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
              className="h-9 pl-10 md:w-[370px] lg:w-[480px] delay-75 transition-all ease-in-out focus:!ring-soraxi-green focus:!outline-none focus:!ring-1 focus:border-transparent"
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
