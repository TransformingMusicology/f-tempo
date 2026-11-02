export function scoreTarget(id: string, part?: string | null) {
    if (!id.startsWith('cpdl_')) return {id, part: null};
    const match = id.match(/_part(\d+)$/);
    return {id: id.replace(/_part\d+$/, ''), part: part ?? match?.[1] ?? null};
}

export function setScoreTarget(params: URLSearchParams, key: 'q' | 'page', id: string, part?: string | null) {
    const target = scoreTarget(id, part);
    params.set(key, target.id);
    if (target.part) params.set('part', target.part);
    else params.delete('part');
}
