import type { Metadata } from 'next'
import React from "react";
import Navigation from "@/app/components/Navigation";
import Container from "react-bootstrap/Container";
import 'bootstrap/dist/css/bootstrap.min.css';
import Script from "next/script";


export const metadata: Metadata = {
  title: 'Create Next App',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
        <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />
    </head>
    <body>
        <Navigation/>
        <Container fluid={true}>
            {children}
        </Container>
        <Script src="https://cdn.jsdelivr.net/npm/react/umd/react.production.min.js" />
        <Script src="https://cdn.jsdelivr.net/npm/react-dom/umd/react-dom.production.min.js" />
        <Script src="https://cdn.jsdelivr.net/npm/react-bootstrap@next/dist/react-bootstrap.min.js"/>
    </body>
    </html>
  )
}
