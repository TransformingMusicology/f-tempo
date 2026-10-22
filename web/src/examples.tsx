import type {ReactNode} from 'react';

export type Example = {library: string; book: string; id: string; description: ReactNode};

/** Curated example queries and what the results show. */
export const EXAMPLES: Example[] = [
    {library: 'GB-Lbl', book: 'K2h7', id: 'GB-Lbl_K2h7_092_1', description: <>Different editions of Berchem, 'O s'io potessi donna' (<i>Cantus</i>)</>},
    {library: 'GB-Lbl', book: 'A360a', id: 'GB-Lbl_A360a_005_0', description: <>Very different editions of Striggio, 'Alma reale' (<i>Canto</i>)</>},
    {library: 'GB-Lbl', book: 'K3k19', id: 'GB-Lbl_K3k19_012_1', description: <>Lassus, 'Susanna faire' (<i>Cantus</i>) and the original French chanson</>},
    {library: 'GB-Lbl', book: 'K3k19', id: 'GB-Lbl_K3k19_014_0', description: <>Marenzio, 'I must depart all haples' (<i>Cantus</i>), and: (a) the original Italian madrigal; (b) at least one Latin <i>contrafactum</i></>},
    {library: 'GB-Lbl', book: 'A324', id: 'GB-Lbl_A324c_048_1', description: <>Nanino, 'Morir non puo'l mio core' (<i>Alto</i>) and the English version (<i>Contratenor</i>) - note the two extra notes at the beginning! There is also a Latin <i>contrafactum</i></>},
    {library: 'GB-Lbl', book: 'K3k12', id: 'GB-Lbl_K3k12_010_0', description: <>Marenzio, 'Sweet hart arise' (<i>Superius</i>), finds many examples of the original Italian madrigal (<i>Canto</i>), as well as the central section of a Latin <i>contrafactum</i> (D-Mbs_bsb00071839_00007)</>},
    {library: 'GB-Lbl', book: 'A19', id: 'GB-Lbl_A19_004_0', description: <>End of Clemens non Papa, 'Pater peccavi' and beginning of its <i>Secunda pars</i>, 'Quanti mercanarii' (<i>Tenor</i>); note the (? mis-)attribution to Manchicourt</>},
    {library: 'GB-Lbl', book: 'K3e1', id: 'GB-Lbl_K3e1_061_1', description: <>Clemens non Papa, 'Angelus domini' (<i>Bassus</i>); you will find various editions of this and other voice-parts, as well as the <i>Secunda pars</i></>},
    {library: 'GB-Lbl', book: 'K2a4', id: 'GB-Lbl_K2a4_072_1', description: <>Lassus, Psalm 11, 'Pourquoy font bruit' (<i>Contratenor</i>), and the chanson on which it is based, 'Las me faut'</>},
    {library: 'GB-Lbl', book: 'K8f10', id: 'GB-Lbl_K8f10_134_1', description: <>Anonymous <i>lauda</i>, 'Ecco care sorelle' (<i>Cantus</i> and <i>Tenor</i> parts on same page!) is actually a close version of Verdelot, 'Fedel' e bel cagnuolo'; note the third note of this piece in the different versions</>},
    {library: 'D-Mbs', book: 'bsb00081871', id: 'D-Mbs_bsb00081871_00095', description: <>Crequillon, 'Confiteor me peccasse' (<i>Bassus</i>) - the first note is wrong, as we can see from the other copies</>},
    {library: 'GB-Lbl', book: 'A569c', id: 'GB-Lbl_A569c_013_1', description: <>'Recercar undecimo' (<i>Canto</i>), by <i>Incerto Autore</i>; this seems to be an untexted close version of Damianus, 'In die tribulationis' (scholars disagree about the identity of this composer)</>},
    {library: 'D-Bsb', book: 'Parangon_03', id: 'D-Bsb_Parangon_03_1543_inv_060_0', description: <>Arcadelt, 'Vous perdez temps' (Tenor). As well as revealing a German <i>contrafactum</i>, this search shows that this chanson is musically identical to his madrigal, 'Non ch'io, non voglio' (the connection is not mentioned in Seay's complete edition of both works); there is also a version of the chanson with different text. This might suggest that the madrigal was the model for various versions of the chanson.</>},
];
