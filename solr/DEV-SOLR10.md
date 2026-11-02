# Independent dev Solr 10.1

Target: `porter.net.nz:/home/alastair/webapps/f-tempo-dev`, branch `new-ui`.
Production and its Solr 9.11 data remain untouched. Use
`compose.preview.solr10.yaml` **alone**, not merged with `compose.preview.yaml`
or production Compose. It preserves the current nginx/static mounts and removes
the app's connection to `f-tempo_default`.

The new backend configuration reads library JSON from `/dev-indexes/`; MEI and
images still use the existing read-only storage paths. PL-Kj has no available
MEI, so it is not exposed as a searchable collection. Its classified JSON may
be retained alongside the other five files.

## Readiness and source delivery

Commit and push the three dev configuration files plus this document to
`new-ui`, then fast-forward the dev checkout. Backend/importer changes were
pushed as `02cf386d`. Preserve the host's untracked `.env`, preview Compose,
and `manifest-backups/`. The new Solr configuration was tested in the isolated
pc instance with the same schema and importer logic.

The pc reindex runner waits for finalized hasmusic JSON, imports the available
MEI with `--skipMissing`, and records every omission. It imports D-Bsb, F-Pn,
GB-Lbl and PL-Wn with four workers each, skips PL-Kj (zero MEI), and runs D-Mbs
last with eight workers. Expected total: 557,490 searchable pages from 566,543
source pages. Counts for music and not-music must match each input's available
pages before the runner reports complete.

Status and logs:
`pc:/home/alastair/code/contract/f-tempo/solr-10.1-validation/reindex-results/`.
Do not launch dev Solr against an empty directory while this is running.

## Transfer and switch after validation

1. Check `reindex-status.json` is complete, inspect `preflight.json` and
   `missing-mei.json`, and compare snapshot size against free destination disk.
2. Stop only `ftempo-solr10-reindex-solr-1` on pc. Use `docker cp` to export its
   `/var/solr` to a fresh snapshot directory. Never copy a writable Lucene index.
3. Rsync that snapshot to the **new dev-only** directory
   `/home/alastair/webapps/f-tempo-dev/solr-data-10.1/`, preserving ownership
   or setting it to Solr UID/GID 8983. Verify copied data before startup.
4. Copy the six updated `index-*.json` and the classification database to a new
   dev directory `/home/alastair/webapps/f-tempo-dev/indexes-hasmusic/`.
   Never overwrite `/mnt/storage/ftempo/index-*.json` in this rollout.
5. Back up the current dev Compose/source revision, then use the updated
   `new-ui` checkout and run:

   ```sh
   FTEMPO_DEV_INDEX_DIR=/home/alastair/webapps/f-tempo-dev/indexes-hasmusic \
   FTEMPO_DEV_SOLR_DATA_DIR=/home/alastair/webapps/f-tempo-dev/solr-data-10.1 \
   docker compose -p f-tempo-dev -f compose.preview.solr10.yaml up -d --build
   ```

6. Verify Solr version/counts, app random and search responses, and confirm the
   dev app is attached only to `f-tempo-dev_default`. Check dev images still
   load through the existing nginx routes. Production must still use its old
   container, network and data directory.

Rollback uses the saved old dev source revision and original
`compose.preview.yaml` (which shares production's Solr); leave the new dev
snapshot intact. Never start Solr 9 against the Solr 10 data directory.
