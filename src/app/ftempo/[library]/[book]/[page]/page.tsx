import {Col, Row} from "react-bootstrap";
import LeftPane, {CurrentPageData} from "@/app/components/ftempo/LeftPane";
import SearchOptions from "@/app/components/ftempo/SearchOptions";
import {getMetadata} from "@/services/search";
import {Suspense} from "react";
import FakeSearchResultList from "@/app/components/ftempo/FakeSearchResultList";
import SearchResultList from "@/app/components/ftempo/SearchResultList";
import SearchResultView from "@/app/components/ftempo/SearchResultView";


type FTempoSearchResults = {
    status: 'ok' | 'error';
    data: any;
    error?: string;
};


export default async function Page({params, searchParams} : {searchParams: { [key: string]: string | string[] | undefined },
    params: { library: string, book: string, page: string } }) {

    // TODO: On page load, check if the URL structure is correct, get data for the page
    /*
                if (params.library !== response.library || params.book !== response.book_id) {
                navigate(`/ftempo/${response.library}/${response.book_id}/${response.page_id}`);
     */
    const metadata = await getMetadata(params.page);

    const pageData: CurrentPageData = {
        library: params.library,
        book: params.book,
        siglum: params.page
    }

    return <Row>
        <Col>
            <LeftPane page={metadata} />
        </Col>
        <Col md={3}>
            <SearchOptions searchParams={searchParams} />
            <Suspense fallback={<FakeSearchResultList numResults={10} />} >
                <SearchResultList currentPage={pageData} />
            </Suspense>
        </Col>
        <Col>
            <Suspense>
                <SearchResultView currentPage={pageData} />
            </Suspense>
        </Col>
    </Row>;
};
