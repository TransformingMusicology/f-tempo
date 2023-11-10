import Button from "react-bootstrap/Button";
import ButtonToolbar from "react-bootstrap/ButtonToolbar";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import FormLabel from "react-bootstrap/FormLabel";
import FormSelect from "react-bootstrap/FormSelect";
import FormCheck from "react-bootstrap/FormCheck";
import Row from "react-bootstrap/Row";
import {getLibraries} from "@/services/search";

type SelectOptions = {
    value: string
    label: string
}

const rankingTypes: SelectOptions[] = [
    {value: 'jaccard', label: 'Jaccard Distance'},
    {value: 'boolean', label: 'Basic'},
    {value: 'solr', label: 'Solr'},
];

const numResultsTypes: SelectOptions[] = [
    {value: '5', label: '5'},
    {value: '10', label: '10'},
    {value: '15', label: '15'},
    {value: '20', label: '20'},
    {value: '25', label: '25'},
    {value: '30', label: '30'}
];

/**
 * Show search options.
 * This component interacts with react-router in order to handle
 *  - On page load, if any query parameters are invalid, all query parameters are cleared
 *  - When a form option is changed, state is modified
 *  - When state is modified, query parameters are set (
 * @param props
 * @constructor
 */

export default async function SearchOptions({searchParams}: {searchParams: { [key: string]: string | string[] | undefined }}) {

    const paramNumResults = searchParams.num_results;
    const paramSimilarityType = searchParams.similarity_type;

    const libraries = await getLibraries();

    return <form method="GET" action="">
        <Row className="mb-3">
            <FormLabel column sm={4}>Result Ranking</FormLabel>
            <Col>
                <FormSelect name="similarity_type" defaultValue={paramSimilarityType}>
                    {rankingTypes.map(rt => {
                        return <option key={rt.value} value={rt.value}>{rt.label}</option>;
                    })}
                </FormSelect>
            </Col>
        </Row>
        <Row className="mb-3">
            <FormLabel column sm={4}>Results to display</FormLabel>
            <Col>
                <FormSelect name="num_results" defaultValue={paramNumResults}>
                    {numResultsTypes.map(rt => {
                        return <option defaultValue={"10"} key={rt.value} value={rt.value}>{rt.label}</option>;
                    })}
                </FormSelect>
            </Col>
        </Row>
        <Row className="mb-3">
            <label>Collections to search</label>
            <Col>
                {libraries.map((library: string[], i: number) => {
                    const libraryName = library[0];
                    return <FormCheck
                        key={libraryName}
                        name="collections_to_search"
                        defaultValue={libraryName}
                        inline
                        label={libraryName}
                        type={"checkbox"}
                        defaultChecked={true}
                        id={`form-collection-check-${i}`}/>;
                })}
            </Col>
        </Row>

        <ButtonToolbar>
            <Button variant="primary" type="submit">Search</Button>
        </ButtonToolbar>
    </form>;
}
