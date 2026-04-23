export type Input = {
    type: 'aruspix' | 'mxml',
    filePath: string,
    id: string,
    library: string,
    book: string,
    page: string,
    notmusic?: boolean,
    titlepage?: string,
}
