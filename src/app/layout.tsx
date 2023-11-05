import type { Metadata } from 'next'
import React from "react";
import Navigation from "@/app/components/Navigation";
import Container from "react-bootstrap/Container";
import 'bootstrap/dist/css/bootstrap.min.css';


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
    </body>
    </html>
  )
}
