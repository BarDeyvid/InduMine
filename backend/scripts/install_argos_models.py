#!/usr/bin/env python3
"""Install Argos Translate models (en->pt, en->es) during Docker image build.

This script downloads available Argos packages and installs any missing
English->Portuguese or English->Spanish models.
"""
import sys
import tempfile
import urllib.request

try:
    from argostranslate import package as arg_package
    from argostranslate import translate as arg_translate
except Exception as e:
    print("argostranslate not installed:", e)
    sys.exit(0)


def main():
    try:
        installed = arg_translate.get_installed_languages()
        installed_codes = {getattr(l, 'code', '') for l in installed}
    except Exception:
        installed_codes = set()

    needed = {"pt", "es"}
    present = set()
    for code in installed_codes:
        if not code:
            continue
        present.add(code.split('_')[0].split('-')[0])

    missing = needed - present
    if not missing:
        print("Argos Translate models already installed:", present)
        return

    print("Missing Argos models:", missing, "— attempting to download/install")

    try:
        available = arg_package.get_available_packages()
    except Exception as e:
        print("Failed to get available Argos packages:", e)
        return

    for pkg in available:
        try:
            from_code = getattr(pkg, 'from_code', '')
            to_code = getattr(pkg, 'to_code', '')
            if from_code.startswith('en') and to_code in missing:
                print(f"Installing package {from_code} -> {to_code}")
                tmpfile = tempfile.NamedTemporaryFile(delete=False)
                tmpfile.close()
                urllib.request.urlretrieve(pkg.download_url, tmpfile.name)
                arg_package.install_from_path(tmpfile.name)
                print(f"Installed {from_code}->{to_code}")
                missing.discard(to_code)
                if not missing:
                    break
        except Exception as e:
            print("Error installing package:", e)

    if missing:
        print("Some Argos models remain missing:", missing)
    else:
        print("Argos Translate models installed successfully.")


if __name__ == '__main__':
    main()
