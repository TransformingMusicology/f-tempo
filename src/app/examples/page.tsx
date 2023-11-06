import CardText from "react-bootstrap/CardText";
import CardBody from "react-bootstrap/CardBody";
import CardImg from "react-bootstrap/CardImg";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Link from "next/link";
import {ReactElement} from "react";


type Example = {
    library: string,
    book: string,
    id: string,
    desc: ReactElement
}

function ExampleLoader() {
    const examples : Example[] = [
        {library: 'GB-Lbl', book: 'K2h7', id: 'GB-Lbl_K2h7_092_1', desc: <>Different editions of Berchem, &quot;O s&apos;io potessi donna&quot; (<i>Cantus</i>)</>},
        {library: 'GB-Lbl', book: 'A360a', id: 'GB-Lbl_A360a_005_0', desc: <>Very different editions of Striggio, &quot;Alma reale&quot; (<i>Canto</i>)</>},
        {library: 'GB-Lbl', book: 'K3k19', id: 'GB-Lbl_K3k19_012_1', desc: <>Lassus, &quot;Susanna faire&quot; (<i>Cantus</i>) and the original French chanson</>},
        {library: 'GB-Lbl', book: 'K3k19', id: 'GB-Lbl_K3k19_014_0', desc: <>Marenzio, &quot;I must depart all haples&quot; (<i>Cantus</i>), and: (a) the original Italian madrigal; (b) the <i>Quinto</i> part of the latter, split between nos. 13 and 14</>},
        {library: 'GB-Lbl', book: 'A324', id: 'GB-Lbl_A324c_048_1', desc: <>Nanino, &quot;Morir non puo&apos;l mio core&quot; (<i>Alto</i>) and the English version (<i>Contratenor</i>) - note the two extra notes at the beginning! There is also a Latin contrafactum at no. 6</>},
        {library: 'GB-Lbl', book: 'K3k12', id: 'GB-Lbl_K3k12_010_0',  desc: <>Marenzio, &quot;Sweet hart arise&quot; (<i>Superius</i>), and the English version (<i>Canto</i>); the Italian <i>Quinto</i> part is ranked at 15 - you can increase the number of results using the dropdown.</>},
        {library: 'GB-Lbl', book: 'K9a10', id: 'GB-Lbl_K9a10_023_0', desc: <>Morales, &quot;Magnificat Sexti toni&quot; (choirbook); ranks 2 & 3 are different voice-parts from the work</>},
        {library: 'GB-Lbl', book: 'A19', id: 'GB-Lbl_A19_004_0',    desc: <>End of Clemens non Papa, &quot;Pater peccavi&quot; and beginning of its <i>Secunda pars</i>, &quot;Quanti mercanarii&quot; (<i>Tenor</i>); &quot;Pater peccavi&quot; is at rank 2</>},
        {library: 'GB-Lbl', book: 'K3e1', id: 'GB-Lbl_K3e1_061_1',  desc: <>Clemens non Papa, &quot;Angelus domini&quot; (<i>Bassus</i>); other editions at ranks 2 to 6, and 9; <i>Tenor</i> part at ranks 7 to 8, and 10; another edition of <i>Bassus</i> at rank 5</>},
        {library: 'GB-Lbl', book: 'K2a4', id: 'GB-Lbl_K2a4_072_1',  desc: <>Lassus, Psalm 11, &quot;Pourquoy font bruit&quot; (<i>Contratenor</i>), and the chanson on which it is based, &quot;Las me faut&quot;, ranked at 2; at ranks 3 & 4 are the two pages of another edition of the chanson</>},
        {library: 'GB-Lbl', book: 'A569c', id: 'GB-Lbl_A569c_024_0', desc: <>Willaert, &quot;Recercar quinto&quot;, was also published in a transposed version  (GB-Lbl_K3b4_013_0) as well as at the original pitch (GB-Lbl_K3b4_020_0)</>},
        {library: 'GB-Lbl', book: 'K8f10', id: 'GB-Lbl_K8f10_134_1', desc: <>Anonymous <i>lauda</i>, &quot;Ecco care sorelle&quot; (<i>Cantus</i> and <i>Tenor</i> parts on same page!) is actually a close version of Verdelot, &quot;Fedel&apos; e bel cagnuolo&quot; (<i>Cantus</i> at rank 2; <i>Tenor</i> at rank 3)</>},
        {library: 'GB-Lbl', book: 'A569c', id: 'GB-Lbl_A569c_013_1', desc: <>&quot;Recercar undecimo&quot; (<i>Canto</i>), by <i>Incerto Autore</i>; at rank 2 is Damianus, &quot;In die tribulationis&quot; (scholars disagree about the identity of this composer); <i>Basso</i> part of the recercar at rank 3</>},
        {library: 'D-Bsb', book: 'Parangon_03', id: 'D-Bsb_Parangon_03_1543_inv_060_0', desc: <>Arcadelt, &quot;Vous perdez temps&quot; (Tenor); turns out to be musically identical to his madrigal, &quot;Non ch&apos;io, non voglio&quot; (K2h3_031_1)</>},
    ];

    return <Row>
        <Col sm={2}/><Col sm={6}>
        {examples.map(ex => {
            return <Card key={ex.id} style={{flexDirection: "row", margin: "1em"}}>
                    <CardImg style={{width: "120px"}} variant="top" src={`https://uk-dev-ftempo.rism.digital/img/jpg/${ex.id}.jpg`} />
                    <CardBody>
                        <CardText><Link href={`/ftempo/${ex.library}/${ex.book}/${ex.id}`}>{ex.desc}</Link></CardText>
                    </CardBody>
                </Card>;
        })
        }
    </Col>
    </Row>;
}

export default ExampleLoader;
