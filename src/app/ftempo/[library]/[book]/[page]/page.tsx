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


export default async function Page(
    props: {searchParams: Promise<{ [key: string]: string | string[] | undefined }>,
        params: Promise<{ library: string, book: string, page: string }> }
) {
    const searchParams = await props.searchParams;
    const params = await props.params;

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

    const paramCollections = searchParams.collections_to_search;
    let paramCollectionsArray: string[] = [];
    if (Array.isArray(paramCollections)) {
        paramCollectionsArray = paramCollections;
    } else if (typeof paramCollections === "string") {
        paramCollectionsArray = [paramCollections];
    }

    const paramNumResults = searchParams.num_results || "10";
    let paramNumResultsSingle = Number(paramNumResults);
    if (Array.isArray(paramNumResults)) {
        paramNumResultsSingle = Number(paramNumResults[0]);
    }

    return <Row>
        <Col>
            <LeftPane page={metadata} />
        </Col>
        <Col md={3}>
            <SearchOptions searchParams={searchParams} />
            {paramCollections && <Suspense fallback={<FakeSearchResultList numResults={10} />} >
                <SearchResultList collectionsToSearch={paramCollectionsArray} numResults={paramNumResultsSingle} currentPage={pageData} />
            </Suspense>}
        </Col>
        <Col>
            {paramCollections && <Suspense>
                <SearchResultView collectionsToSearch={paramCollectionsArray} numResults={paramNumResultsSingle} currentPage={pageData} />
            </Suspense>}
        </Col>
    </Row>;
};
