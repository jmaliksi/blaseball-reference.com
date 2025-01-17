import useAlgoliaSearchResults from "hooks/useAlgoliaSearchResults";
import * as React from "react";
import { useRouter } from "next/router";

import { GetStaticProps } from "next";
import Player from "types/player";
import Team from "types/team";

import { Box, Flex, Heading, Image, Link } from "@chakra-ui/react";
import Head from "next/head";
import NextLink from "next/link";
import Layout from "components/Layout";

export default function SearchPage() {
  const router = useRouter();
  const [{ isError, isLoading, results }, setSearchTerm] =
    useAlgoliaSearchResults();

  const searchTerm = String(router.query.searchTerm);

  React.useEffect(() => {
    if (searchTerm != null) {
      setSearchTerm(searchTerm);
    }
  }, [searchTerm, setSearchTerm]);

  return (
    <>
      <Head>
        <title>
          Search Blaseball Players and Teams - Blaseball-Reference.com
        </title>
        <meta
          property="og:title"
          content="Search Blaseball Players and Teams - Blaseball-Reference.com"
          key="og:title"
        />
        <meta
          name="description"
          property="og:description"
          content="Search for Blaseball players and teams. Find Blaseball player stats and more at Blaseball-Reference.com."
        />
      </Head>
      <Layout>
        <Heading as="h1" size="lg" mb={4}>
          Search Results
        </Heading>

        {router.query?.searchTerm ? (
          <SearchResults
            isError={isError}
            isLoading={isLoading}
            searchResults={results}
          />
        ) : (
          <Box>Please enter a search query.</Box>
        )}
      </Layout>
    </>
  );
}

type SearchResultsProps = {
  isError: boolean;
  isLoading: boolean;
  searchResults: { players?: Player[]; teams?: Team[] };
};
function SearchResults({
  isError,
  isLoading,
  searchResults,
}: SearchResultsProps) {
  if (isError) {
    return (
      <Box>
        Sorry, we're having trouble processing your search. Please refresh the
        page.
      </Box>
    );
  }

  if (isLoading) {
    return <Box>Loading search results...</Box>;
  }

  return (
    <>
      {Object.keys(searchResults).length === 0 ? (
        <Box>No results found.</Box>
      ) : (
        Object.keys(searchResults).map((resultGroup) => (
          <Box key={resultGroup} _notLast={{ mb: 4 }}>
            <Heading as="h2" mb={1} size="md" textTransform="capitalize">
              {resultGroup}
            </Heading>
            {searchResults[resultGroup].map((result) => (
              <Box key={result.objectID} py={1}>
                <Link href={result.anchor} as={NextLink}>
                  {result.title}
                </Link>
              </Box>
            ))}
          </Box>
        ))
      )}
      <Flex justifyContent={{ base: "center", md: "flex-start" }} mt={6}>
        <Link display="inlineBlock" href="https://algolia.com" isExternal>
          <Image
            alt="Search by Algolia"
            height="16px"
            src="/search-by-algolia.svg"
          />
        </Link>
      </Flex>
    </>
  );
}

export const getStaticProps: GetStaticProps = async ({ preview = false }) => {
  return {
    props: {
      preview,
    },
  };
};
