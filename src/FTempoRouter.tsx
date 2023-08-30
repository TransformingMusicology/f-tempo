import { createBrowserRouter, Navigate } from "react-router-dom";
import ResourceLoader from "./ResourceLoader";
import RootLayout from "./RootLayout";
import FTempo from "./ftempo/FTempo";
import HelpPage from "./HelpPage";
import ExampleLoader from "./ExampleLoader";
import SearchLoader from "./SearchLoader";
import BrowseLoader from "./BrowseLoader";
import ExternalLoader from "./ExternalLoader";


const FTempoRouter = createBrowserRouter([
    {
        path: "/",
        element: <RootLayout />,
        errorElement: <main style={{ padding: "1rem" }}>
            <p>There's nothing here!</p>
        </main>,
        children: [
            {
                path: "choose",
                element: <ResourceLoader />,
            },
            {
                path: "examples",
                element: <ExampleLoader />,
            },
            {
                path: "search",
                element: <SearchLoader />,
            },
            {
                path: "browse",
                element: <BrowseLoader />,
            },
            {
                path: "external",
                element: <ExternalLoader />,
            },
            {
                path: "ftempo",
                element: <Navigate replace to={"/ftempo/GB-Lbl/A103b/GB-Lbl_A103b_025_0"} />,
            },
            {
                path: "ftempo/:library/:book/:id",
                element: <FTempo />,
            },
            {
                path: "help",
                element: <HelpPage />,
            }
        ]
    }
]);

export default FTempoRouter;
