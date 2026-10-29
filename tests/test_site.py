"""Validate generated pages, metadata and local asset references."""

import importlib.util
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import unittest
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("build_site", ROOT / "scripts/build_site.py")
BUILDER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BUILDER)


class Page(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.elements = []
        self.feed(source)

    def handle_starttag(self, tag, attributes):
        self.elements.append((tag, dict(attributes)))

    def matching(self, tag, **attributes):
        return [
            values for name, values in self.elements
            if name == tag and all(values.get(key) == value for key, value in attributes.items())
        ]


class StaticSiteTests(unittest.TestCase):
    def test_generated_pages_are_current(self):
        for relative, expected in BUILDER.render_files().items():
            with self.subTest(file=relative):
                self.assertEqual((ROOT / relative).read_text(encoding="utf-8"), expected)

    def test_pages_are_indexable_and_metadata_is_consistent(self):
        for language, route, locale in [("es", "", "es_ES"), ("en", "en/", "en_GB")]:
            with self.subTest(language=language):
                source = (ROOT / route / "index.html").read_text(encoding="utf-8")
                page = Page(source)
                url = "https://jingguanchong.com/" + route
                self.assertEqual(page.matching("html")[0]["lang"], language)
                self.assertEqual(len(page.matching("h1")), 1)
                self.assertEqual(page.matching("link", rel="canonical")[0]["href"], url)
                alternates = {item["hreflang"]: item["href"] for item in page.matching("link", rel="alternate")}
                self.assertEqual(alternates, {
                    "es": "https://jingguanchong.com/",
                    "en": "https://jingguanchong.com/en/",
                    "x-default": "https://jingguanchong.com/",
                })
                self.assertNotIn("noindex", page.matching("meta", name="robots")[0]["content"])
                self.assertEqual(page.matching("meta", property="og:url")[0]["content"], url)
                self.assertEqual(page.matching("meta", property="og:locale")[0]["content"], locale)
                self.assertLessEqual(len(page.matching("meta", name="description")[0]["content"]), 160)
                person = json.loads(re.search(r'<script type="application/ld\+json">(.+?)</script>', source, re.S)[1])
                self.assertEqual(person["jobTitle"], "Data & AI Engineer")
                self.assertEqual(person["worksFor"]["name"], "Decathlon")
                self.assertEqual(person["sameAs"], ["https://www.linkedin.com/in/jingchong/"])
                self.assertIn("StartMotion Auto", source)
                self.assertIn("Inferencia Técnica", source)
                self.assertNotIn("Local preview", source)
                self.assertNotIn("Vista local", source)

    def test_references_are_resolvable_and_assets_are_local(self):
        for relative in ["index.html", "en/index.html"]:
            with self.subTest(file=relative):
                path = ROOT / relative
                page = Page(path.read_text(encoding="utf-8"))
                ids = [attrs["id"] for _, attrs in page.elements if "id" in attrs]
                self.assertEqual(len(ids), len(set(ids)))
                for tag, attrs in page.elements:
                    for target in attrs.get("aria-controls", "").split():
                        self.assertIn(target, ids)
                    reference = attrs.get("src", attrs.get("href", ""))
                    if not reference:
                        continue
                    if reference.startswith("#"):
                        self.assertIn(reference[1:], ids)
                    elif not urlsplit(reference).scheme:
                        self.assertTrue((path.parent / urlsplit(reference).path).exists(), reference)
                    if tag in ("script", "img") or attrs.get("rel") in ("stylesheet", "preload"):
                        self.assertFalse(urlsplit(reference).netloc, reference)
                for image in page.matching("img"):
                    self.assertTrue(image.get("alt"))
                    self.assertTrue(image.get("width") and image.get("height"))
        css = ROOT / "assets/css/main.css"
        for asset in re.findall(r"url\(['\"]?([^)'\"]+)", css.read_text()):
            self.assertTrue((css.parent / asset).exists(), asset)

    def test_sitemap_and_robots_expose_both_languages(self):
        sitemap = ET.fromstring((ROOT / "sitemap.xml").read_text())
        urls = {node.text for node in sitemap.iter("{http://www.sitemaps.org/schemas/sitemap/0.9}loc")}
        self.assertEqual(urls, {"https://jingguanchong.com/", "https://jingguanchong.com/en/"})
        robots = (ROOT / "robots.txt").read_text()
        self.assertIn("Allow: /", robots)
        self.assertIn("Sitemap: https://jingguanchong.com/sitemap.xml", robots)


if __name__ == "__main__":
    unittest.main()
