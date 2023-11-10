"use client"
import {useCallback, useEffect} from "react";
import Table from "react-bootstrap/Table";
import ProgressBar from "react-bootstrap/ProgressBar";
import {usePathname, useSearchParams, useRouter} from "next/navigation";

export default function SearchResultListClient(props: {results: any}) {

    const search = useSearchParams();

    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()!

    const searchN = search.get('n');
    const searchNNumber = Number(searchN);

    const createQueryString = useCallback(
        (name: string, value: string) => {
            const params = new URLSearchParams(searchParams)
            params.set(name, value)

            return params.toString()
        },
        [searchParams]
    )

    const setResultCallback = useCallback((selectedResult: number) => {
        router.replace(pathname + '?' + createQueryString('n', String(selectedResult)), {scroll: false})
    }, [createQueryString, pathname, router]);

    /*
    // TODO: enter to search
    // TODO: Left/right move l/r based on selected item
    */
    useEffect(() => {
        function downHandler(event: any): void {
            if ([38, 40].indexOf(event.keyCode) > -1) {
                event.preventDefault();
            }
            if (event.keyCode === 38) {    // up arrow
                if (searchNNumber > 1) {
                    setResultCallback(searchNNumber - 1);
                }
            } else if (event.keyCode === 40) {    // down arrow
                if (searchNNumber < props.results.results.length) {
                    setResultCallback(searchNNumber + 1);
                }
            }
        }
        window.addEventListener("keydown", downHandler);
        return () => {
            window.removeEventListener("keydown", downHandler);
        };
    }, [props.results.results.length, searchNNumber, setResultCallback]);

    return <Table>
        <thead>
            <tr><th colSpan={4}>{props.results.results.length} results &mdash; {props.results.numQueryWords} words in query</th></tr>
            <tr>
                <th style={{width: `37px`}} />
                <th>Page ID</th>
                <th style={{maxWidth: `200px`}}>Match Score</th>
                <th style={{width: `30px`}} />
            </tr>
        </thead>
        <tbody>
            {props.results.results.map((result: any, index: number) => {
                const percent = 100 - result.jaccard * 100;
                const progress = Number.parseFloat(String(percent)).toFixed(2);
                let compare = <></>;
                let titlePage = <></>;

                if (props.results.currentPage && props.results.currentPage.page_id !== result.id) {
                    const cp = props.results.currentPage;
                    const url = `/compare?qlib=${cp.library}&qbook=${cp.book}&qid=${cp.page_id}&mlib=${result.library}&mbook=${result.book}&mid=${result.id}`;
                    compare = <img alt="compare query and result"
                        width='16' height='16' src='/img/magnifying-glass.svg'
                        onClick={() => {
                            window.open(url, "_blank",
                                'width=1200, height=600, directories=no, location=no, menubar=no, resizable=no, scrollbars=1, status=no, toolbar=no');
                        }}
                    />;
                }
                if (result.titlepage) {
                    titlePage = <img src="/img/tp_book.svg" alt="View the title page for this result's book" height="20" />;
                }
                return <tr
                    key={result.id}
                    style={{cursor: "pointer"}}
                    onClick={() => setResultCallback(index + 1)}
                    className={searchNNumber === index + 1 ? "table-danger" : ""}
                    >
                    <td>{titlePage}</td>
                    <td>{result.id}</td>
                    <td><ProgressBar now={percent} label={progress} /></td>
                    <td>{compare}</td>
                </tr>;
            })}
        </tbody>
    </Table>;
};
