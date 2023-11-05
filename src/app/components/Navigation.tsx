import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import NavbarBrand from "react-bootstrap/NavbarBrand";
import NavbarCollapse from "react-bootstrap/NavbarCollapse";
import NavLink from "react-bootstrap/NavLink";
import Link from "next/link";

export default function Navigation() {
    return (
        <Navbar bg="dark" expand="lg" variant="dark">
            <Container>
                <NavbarBrand href="#home">F-Tempo</NavbarBrand>
                <NavbarCollapse id="responsive-navbar-nav" role={"Main Navigation"}>
                    <Nav>
                        <NavLink as={Link} href="/examples">Examples</NavLink>
                    </Nav>
                    <Nav>
                        <NavLink as={Link} href="/search">Manual search</NavLink>
                    </Nav>
                    <Nav>
                        <NavLink as={Link} href="/browse">Browse corpus</NavLink>
                    </Nav>
                    <Nav>
                        <NavLink as={Link} href="/help">Help</NavLink>
                    </Nav>
                </NavbarCollapse>
            </Container>
        </Navbar>
    );
}
