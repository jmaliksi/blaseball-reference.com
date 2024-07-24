import * as React from "react";

import {
  Alert,
  AlertDescription,
  AlertIcon,
  Container,
  Link,
} from "@chakra-ui/react";
import Feedback from "components/Feedback";
import Footer from "components/Footer";
import Navigation from "components/Navigation";
import NextLink from "next/link";
import { SkipNavContent } from "@reach/skip-nav";

type Props = {
  children: React.ReactNode;
};

export default function Layout({ children }: Props) {
  return (
    <>
      <Navigation />
      <main>
        <Container maxWidth="6xl">
          <PreviewBuildWarning />

          <>
            <SkipNavContent />
            {children}
            <Feedback />
          </>
        </Container>
      </main>
      <Footer />
    </>
  );
}

function PreviewBuildWarning() {
  const DEPLOYMENT_ENV = process.env.NEXT_PUBLIC_DEPLOYMENT_ENV;

  if (DEPLOYMENT_ENV === "production") {
    return null;
  }

  return (
    <Alert mb={4} status="warning">
      <AlertIcon />
      <AlertDescription>
        This is a subdomain intended for previewing unstable features. For the
        main website, visit{" "}
        <Link
          href="https://blaseball-reference.com/"
          as={NextLink}
          display="inline-block"
          isExternal
          textDecoration="underline"
        >
          www.blaseball-reference.com
        </Link>
        .
      </AlertDescription>
    </Alert>
  );
}
