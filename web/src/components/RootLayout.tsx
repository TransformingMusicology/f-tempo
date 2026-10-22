import {Container, Nav, Navbar} from 'react-bootstrap';
import {NavLink, Outlet, useNavigation} from 'react-router';
import {DEFAULT_PAGE_ID} from '../config';

export default function RootLayout() {
    const navigation = useNavigation();
    return (
        <>
            <Navbar bg="dark" data-bs-theme="dark" expand="md" className="mb-3">
                <Container fluid>
                    <Navbar.Brand as={NavLink} to={`/page/${DEFAULT_PAGE_ID}`}>F-TEMPO</Navbar.Brand>
                    <Navbar.Toggle aria-controls="main-nav" />
                    <Navbar.Collapse id="main-nav">
                        <Nav>
                            <Nav.Link as={NavLink} to={`/page/${DEFAULT_PAGE_ID}`}>Browse</Nav.Link>
                            <Nav.Link as={NavLink} to="/search">Search by ID or code</Nav.Link>
                            <Nav.Link as={NavLink} to="/upload">Upload an image</Nav.Link>
                            <Nav.Link as={NavLink} to="/examples">Examples</Nav.Link>
                            <Nav.Link as={NavLink} to="/help">Help</Nav.Link>
                        </Nav>
                    </Navbar.Collapse>
                    {navigation.state !== 'idle' && <span className="navbar-text small" aria-live="polite">Loading…</span>}
                </Container>
            </Navbar>
            <Container fluid>
                <Outlet />
            </Container>
        </>
    );
}
