import Navigation from "./Navigation";
import React from "react";
import { Container } from 'react-bootstrap';
import { Outlet } from "react-router-dom";


function RootLayout() {
    return <><Navigation/>
        <Container fluid={true}>
            <Outlet />
        </Container></>;
}

export default RootLayout;
