# CPDL local experiment

Nothing in this experiment is deployed or pushed. It uses the isolated pc Solr
that already holds the 557,490 historical documents; the stopped deployment
snapshot and porter data are separate and unchanged.

## Dataset reconstruction

`reconstruct_cpdl.py` scans every `.mei` file in the seven composer directories
named by the old CPDL index. It does not restrict the scan to the old score list.
Actual filenames are retained (including prefixes and URL escapes). A unique
accent-normalized directory match handles `Tomas` versus `Tomás` and is recorded
in the audit. Missing or ambiguous directories stop reconstruction.

The score ID uses the old composer key and a 16-character SHA-256 prefix of the
relative filepath. Part IDs append `_part{staffDef n}`; labels are metadata, not
identity. IDs remain stable if other files are added. A detected ID collision
stops reconstruction.

On pc:

```sh
python3 /home/alastair/code/contract/f-tempo/solr-10.1-validation/reconstruct_cpdl.py \
  --seed-index /home/alastair/code/contract/f-tempo/storage/ftempo/index-cpdl.json \
  --scores /home/alastair/code/contract/f-tempo/storage/ftempo/scores/cpdl \
  --output /home/alastair/code/contract/f-tempo/solr-10.1-validation/cpdl-experiment
```

Outputs:
- `index-cpdl.json`: score-level importer manifest with valid exact paths.
- `index-cpdl-browse.json`: per-staff browse manifest whose IDs match Solr.
- `audit.json`: file hashes, staff labels/note counts, warnings and exclusions.

Validation covers XML well-formedness and the current importer's required
staff/pitch structure, not full MEI schema validity or musical accuracy. It
preserves unlabeled, duplicate-label and empty parts with explicit warnings.

Results: 905 files found, 904 accepted, 3,840 parts. The excluded
`Josquin_des_Prez/mei/Josquin_des_Prez_TUMS_Busking_Book_1_0.mei` contains a note
without `pname`. Twenty-eight accepted scores have duplicate part labels.

## Import and runtime

The staged source is in pc's `solr-10.1-validation/app/`; the experiment image
is `ftempo-cpdl-experiment:20261102`. The importer initially used image
`de97c231954b78327e3fbf10573a850f1af683ec254b7faacef61e0a69b1b19e`;
the backend was rebuilt with the subsequent navigation fix as
`535266ec563d683e47b71965f5c8b94eedc68ab70ac0847620f7b2781d378149`.
Source modifications must be staged and the image rebuilt before rerunning.

Container `ftempo-cpdl-import` ran `server/mei_to_solr.ts importmei
/experiment/index-cpdl.json`, with one importer thread and no `--skipMissing`.
It exited 0 after all 904 scores. Its logs remain available via `docker logs`.
Do not repeat an import without checking existing CPDL documents: stable IDs
replace matching documents but do not remove obsolete ones.

`ftempo-cpdl-backend` listens on pc `127.0.0.1:18000`. Its config is
`/home/alastair/code/contract/f-tempo/solr-10.1-validation/cpdl-experiment-config.json`,
mounted at `/experiment-config.json` and selected by `FTEMPO_CONFIG`. It uses
Solr service `solr:8983`, the five historical manifests plus the CPDL browse
manifest under `/experiment`, and read-only MEI under `/storage/ftempo/scores`.
Both containers join only `ftempo-solr10-reindex_default`.

Use `ssh -N -L 18001:127.0.0.1:18000 pc` for the local frontend API proxy.
From `frontend/` in the local `f-tempo-wt-new-ui` checkout, run:

```sh
FTEMPO_API_PROXY=http://127.0.0.1:18001 npm run dev -- --host 127.0.0.1 --port 8770 --strictPort
```

The preview is `http://127.0.0.1:8770/explore`. CPDL query and result panes
render the full score automatically, with the indexed staff's notes coloured.
“Only matching part” removes other staffs without changing the source note IDs.
Score pagination is independent of corpus navigation; matching passages select
the score page containing the first matching note. Highlighting requires an
exact match between the rendered voice's interval sequence and the indexed one.
Each score render uses its own Verovio toolkit to avoid changing scan overlays.

The earlier smoke backend is stopped and retained as
`ftempo-solr10-backend-pre-cpdl`.

## Verification and example

`cpdl-experiment/verification.json` on pc records exhaustive agreement of all
3,840 Solr IDs, labels, staff numbers, paths and `notmusic:false` flags against
the browse manifest. Historical document count remains 557,490. Metadata and
next-part navigation also pass. Three focused reconstruction tests run with:

```sh
python3 -m unittest discover -s scripts -p test_reconstruct_cpdl.py
```

Example part: `cpdl_Cipriano_de_Rore_c0f3fa654fa71db6_part1` (Canto).
Searching historical page `GB-Lbl_D177_008_1` with collection `cpdl` and Jaccard
ranking returns this part first. That demonstrates cross-corpus retrieval; it
does not by itself establish a correct musical match.

Browser checks passed for the Rore Canto (six score pages / two part pages),
its self-search, historical-to-CPDL retrieval, and Palestrina's second staff
(`cpdl_Giovanni_Pierluigi_da_Palestrina_22757e7f4ac58544_part2`, Altus [Tenor I]).
The latter verifies that highlighting selects staff 2 rather than defaulting
to the top staff. Three score-part unit tests plus the existing scan-overlay
test and the frontend production build pass. These checks do not constitute a
rendering audit of every reconstructed score.

Follow-up fixes: extraction now removes empty nested staff groups (the Palestrina
`b4505c1947e0767a_part2` practice accompaniment reproduced Verovio's empty-group
error). The exact score now renders with the bundled toolkit. Full-score views
mark the selected staff with a pale band, while comparison uses the scan colours:
pink shared patterns, teal other selected-voice notes, orange passage ranges.
Comparison is independently computed for the selected pair and n-gram length;
it no longer depends on server-side scattered-match filtering. Result labels
use title, composer and voice; internal IDs remain available on hover.

Verified musical roundtrips (pc reports `bonjour-roundtrip.json` and
`rore-roundtrip.json`):
- `cpdl_Orlando_di_Lasso_08b68b758e88e361_part1` and `GB-Lbl_A337b_021_1`:
  Bonjour mon cœur, Superius, 97 consecutive matching intervals and reciprocal
  rank 1. The scan heading and lyrics confirm the piece and voice.
- `cpdl_Cipriano_de_Rore_e0af8de962f9e951_part2` and `GB-Lbl_A324c_045_0`:
  Anchor che col partire, Alto, 148 of 152 intervals matching; scan title and
  lyrics agree. Reverse retrieval ranks another CPDL edition of the voice first.
