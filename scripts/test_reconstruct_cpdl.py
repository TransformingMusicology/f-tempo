from pathlib import Path
import tempfile
import unittest
import xml.etree.ElementTree as ET

from reconstruct_cpdl import reconstruct, score_title


class ReconstructionTests(unittest.TestCase):
    def test_header_title_preserves_text_and_ignores_empty_titles(self):
        root=ET.fromstring('<mei xmlns="http://www.music-encoding.org/ns/mei"><meiHead><fileDesc><titleStmt><title/><title>  O <rend>dolce</rend> vita  </title></titleStmt></fileDesc></meiHead></mei>')
        self.assertEqual(score_title(root,Path('Composer/mei/Composer_wrong.mei')),('O dolce vita','mei_header'))

    def test_missing_header_uses_decoded_filename_without_composer(self):
        self.assertEqual(score_title(ET.fromstring('<mei/>'),Path('Tomás/mei/Tomas_Dissi_a_l%27amata.mei')),("Dissi a l'amata",'filename'))

    def test_all_files_are_scanned_and_ids_stay_stable_with_duplicate_labels(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            directory=root/'Composer'/'mei'
            directory.mkdir(parents=True)
            xml='<mei><staffDef n="1"><label>Canto</label></staffDef><staffDef n="2"><label>Canto</label></staffDef><measure><staff n="1"><note pname="c" oct="4"/></staff></measure></mei>'
            (directory/'one.mei').write_text(xml)
            seed={'books':{'Composer':{'pages':{}}}}
            first,audit=reconstruct(seed,root)
            self.assertEqual(audit['totals']['parts'],2)
            self.assertIn('Duplicate part labels; numeric part IDs required',audit['included'][0]['warnings'])
            pid=next(iter(first['books']['Composer']['pages']))
            (directory/'two.mei').write_text(xml)
            second,_=reconstruct(seed,root)
            self.assertIn(pid,second['books']['Composer']['pages'])
            self.assertEqual(len(second['books']['Composer']['pages']),2)

    def test_invalid_xml_is_recorded_without_a_manifest_entry(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            directory=root/'Composer'/'mei'
            directory.mkdir(parents=True)
            (directory/'broken.mei').write_text('<mei>')
            manifest,audit=reconstruct({'books':{'Composer':{}}},root)
            self.assertFalse(manifest['books']['Composer']['pages'])
            self.assertEqual(audit['totals']['excluded'],1)
            self.assertEqual(audit['excluded'][0]['path'],'Composer/mei/broken.mei')

    def test_accented_directory_is_used_in_manifest_paths(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            directory=root/'Tomás'/'mei'
            directory.mkdir(parents=True)
            (directory/'score.mei').write_text('<mei><staffDef n="1"/><measure><staff n="1"><note pname="c" oct="4"/></staff></measure></mei>')
            manifest,audit=reconstruct({'books':{'Tomas':{}}},root)
            self.assertEqual(manifest['book_ids'],['Tomás'])
            self.assertEqual(audit['composers']['Tomas']['directory'],'Tomás')


if __name__=='__main__':unittest.main()
