"""Generate committed static pages without requiring JavaScript to read them."""

import argparse
from html import escape
import json
from pathlib import Path
from string import Template
from urllib.parse import urljoin

ROOT = Path(__file__).resolve().parents[1]
LANGUAGES = {"es": ("", "Español", "es_ES"), "en": ("en/", "English", "en_GB")}
RICH_TAGS = ("<br>", "<em>", "</em>")


def rich_text(value):
    """Allow only the editorial line breaks and emphasis used by our content."""
    result = escape(value)
    for tag in RICH_TAGS:
        result = result.replace(escape(tag), tag)
    return result


def education_group(title, rows, opened=False):
    items = "".join(
        f"<li><strong>{escape(name)}</strong><span>{escape(note)}</span></li>"
        for name, note in rows
    )
    state = " open" if opened else ""
    return (
        f'<details class="learning-group"{state}><summary>{escape(title)}</summary>'
        f'<ul class="education-list">{items}</ul></details>'
    )


def network_graph():
    paths = []
    for key, x, y in (
        ("process", 500, 80),
        ("data", 140, 273),
        ("apis", 860, 273),
        ("human", 270, 508),
        ("observe", 750, 508),
    ):
        paths.append(
            f'<path class="edge" data-connection="agents {key}" d="M500 298 L{x} {y}"/>'
        )
    paths.append(
        '<path class="edge" data-connection="human observe" d="M270 508 L750 508"/>'
    )
    return (
        '<svg viewBox="0 0 1000 620" preserveAspectRatio="none" aria-hidden="true">'
        + "".join(paths)
        + "</svg>"
    )


def render_page(language, data, identity, template):
    ui = data["ui"]
    route, _, locale = LANGUAGES[language]
    base = "../" if route else ""
    canonical = urljoin(identity["url"], route)
    values = {
        key: escape(value)
        for source in (data, ui)
        for key, value in source.items()
        if isinstance(value, str)
    }
    for key in ("about_title", "work_title", "learn_title", "contact_title"):
        values[key] = rich_text(data[key])
    navigation = [
        ("about", data["nav"][0]),
        ("work", data["nav"][1]),
        ("approach", ui["approach"]),
        ("learning", data["nav"][2]),
        ("contact", data["nav"][3]),
    ]
    values["navigation"] = "".join(
        f'<a href="#{anchor}">{escape(label)}</a>' for anchor, label in navigation
    )
    language_links = []
    for code, (path, label, _) in LANGUAGES.items():
        state = ' aria-current="page"' if code == language else ""
        href = base + path or "./"
        language_links.append(
            f'<a href="{href}" lang="{code}" hreflang="{code}" '
            f'aria-label="{code.upper()} — {label}"{state}>{code.upper()}</a>'
        )
    values["languages"] = "".join(language_links)
    values["expertise"] = "".join(f"<span>{escape(item)}</span>" for item in data["expertise"])
    values["work_items"] = "".join(
        '<details><summary>'
        f'<span class="context-no">{index:02}</span>'
        f'<span class="context-name">{escape(name)}</span>'
        f'<span class="context-role">{escape(role)}</span></summary>'
        f'<div class="context-body"><p>{escape(description)}</p>'
        f'<p class="tags">{escape(note)}</p></div></details>'
        for index, (name, role, description, note) in enumerate(data["work"], 1)
    )
    values["education"] = "".join(
        [
            education_group(data["education_title"], data["education"]),
            education_group(data["cert_title"], data["certs"], opened=True),
            education_group(data["program_title"], data["programs"]),
        ]
    )
    buttons, panels = [], []
    for node in data["nodes"]:
        key = escape(node["key"])
        buttons.append(
            f'<button type="button" class="map-node node-{key}" data-choice="{key}" '
            f'aria-controls="map-{key}" aria-pressed="false" disabled>'
            f'<small>{escape(node["category"])}</small>'
            f'<strong>{escape(node["label"])}</strong></button>'
        )
        panels.append(
            f'<div data-panel="{key}" id="map-{key}" class="map-info">'
            f'<span class="info-number">{escape(node["number"])}</span><div>'
            f'<h3>{escape(node["title"])}</h3><p>{escape(node["body"])}</p></div></div>'
        )
    person = {
        "@context": "https://schema.org",
        "@type": "Person",
        "@id": identity["url"] + "#person",
        "name": identity["name"],
        "url": identity["url"],
        "jobTitle": identity["job_title"],
        "worksFor": {"@type": "Organization", "name": identity["employer"]},
        "sameAs": [identity["linkedin"]],
    }
    roles = (
        f'{escape(identity["job_title"])} · {escape(identity["employer"])}<br>'
        f'{escape(identity["education_role"])} ·<br>'
        f'{escape(identity["education_organisation"])}'
    )
    values.update(
        language=language,
        base=base,
        canonical=escape(canonical),
        site_url=escape(identity["url"]),
        image_url=escape(urljoin(identity["url"], identity["image"])),
        image_path=escape(identity["image"]),
        portrait_alt=escape(data["portrait"]),
        name=escape(identity["name"]),
        descriptor=escape(identity["descriptor"]),
        roles=roles,
        linkedin=escape(identity["linkedin"]),
        email_address=escape(identity["email"]),
        email_label=escape(data["email"]),
        navigation_label=escape(ui["landmark_nav"]),
        language_label=escape(ui["landmark_language"]),
        skip_label=escape(data["skip"]),
        headline=rich_text(data["atlas_headline"]),
        work_action=escape(data["actions"][0]),
        graph=network_graph(),
        node_buttons="".join(buttons),
        node_panels="".join(panels),
        og_locale=locale,
        og_alternate=LANGUAGES["en" if language == "es" else "es"][2],
        structured_data=json.dumps(person, ensure_ascii=False).replace("<", "\\u003c"),
    )
    return template.substitute(values)


def render_files():
    source = json.loads((ROOT / "content/site.json").read_text(encoding="utf-8"))
    template = Template((ROOT / "templates/page.html").read_text(encoding="utf-8"))
    result = {
        f"{route}index.html": render_page(code, source["locales"][code], source["identity"], template)
        for code, (route, _, _) in LANGUAGES.items()
    }
    origin = source["identity"]["url"]
    result["robots.txt"] = f"User-agent: *\nAllow: /\nSitemap: {origin}sitemap.xml\n"
    urls = "".join(
        f"  <url><loc>{escape(urljoin(origin, route))}</loc></url>\n"
        for route, _, _ in LANGUAGES.values()
    )
    result["sitemap.xml"] = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + urls + "</urlset>\n"
    )
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Fail if generated files are stale.")
    args = parser.parse_args()
    stale = []
    for relative, text in render_files().items():
        target = ROOT / relative
        if args.check:
            if not target.exists() or target.read_text(encoding="utf-8") != text:
                stale.append(relative)
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(text, encoding="utf-8")
            print(f"Generated {relative}")
    if stale:
        parser.exit(1, "Run npm run build to update: " + ", ".join(stale) + "\n")


if __name__ == "__main__":
    main()
