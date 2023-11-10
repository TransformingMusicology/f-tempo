import {Button, ButtonGroup, Row} from "react-bootstrap";
import ImageView from "./ImageView";
import Link from "next/link";
import {searchNextBookId, searchNextPageId} from "@/services/search";

export type CurrentPageData = {
    library: string
    book: string
    siglum: string
    page_id?: string
}

type LeftPaneProps = {
    page: CurrentPageData;
}

export default async function LeftPane(props: LeftPaneProps) {
    const { page } = props;

    // const change_book = useCallback((direction: 'next'|'prev') => {
    //     apiClient.changeBook(direction, props.page.library, props.page.book_id).then(page => {
    //         navigate(`/ftempo/${page.library}/${page.book_id}/${page.page_id}`);
    //     });
    // }, [apiClient, navigate, props.page.book_id, props.page.library]);
    //
    // const change_page = useCallback((direction: 'next'|'prev') => {
    //     apiClient.changePage(direction, props.page.library, props.page.book_id, props.page.page_id).then(page => {
    //         navigate(`/ftempo/${page.library}/${page.book_id}/${page.page_id}`);
    //     });
    // }, [apiClient, navigate, props.page.book_id, props.page.library]);


    const prevPage = await searchNextPageId(page.library, page.book, page.siglum, "prev");
    const nextPage = await searchNextPageId(page.library, page.book, page.siglum, "next");
    const prevBook = await searchNextBookId(page.library, page.book, "prev");
    const nextBook = await searchNextBookId(page.library, page.book, "next");

    /*
    // Navigation for next/prev page/book
    useEffect(() => {
        const downHandler = (event: KeyboardEvent) => {
            if ([37, 39, 220].indexOf(event.keyCode) > -1) {
                event.preventDefault();
            }
            const shiftDown = event.shiftKey;
            if (event.keyCode === 37) {
                // left arrow
                if (shiftDown) {
                    change_book("prev");
                } else {
                    change_page("prev");
                }
            } else if (event.keyCode === 39) {
                // right arrow - Search next page/book
                if (shiftDown) {
                    change_book("next");
                } else {
                    change_page("next");
                }
            } else if (event.keyCode === 220) {
                // '\' for random query
                change_random_page();
            }
        };
        window.addEventListener("keydown", downHandler);
        return () => {
            window.removeEventListener("keydown", downHandler);
        };
    }, [change_book, change_page, change_random_page]);
    */

    return (<>
        <Row>
            <ButtonGroup>
                <Button variant="outline-secondary" size="sm">Previous Book</Button>&nbsp;
                <Button variant="outline-secondary" size="sm">Previous Page</Button>&nbsp;
                <Link href={`/ftempo/random`}>
                    <Button variant="outline-secondary" size="sm">Random Page</Button>
                </Link>&nbsp;
                <Button variant="outline-secondary" size="sm">Next Page</Button>&nbsp;
                <Button variant="outline-secondary" size="sm">Next Book</Button>
            </ButtonGroup>
        </Row>
        <Row>
            <ImageView page={props.page} />
        </Row>
    </>);
};
