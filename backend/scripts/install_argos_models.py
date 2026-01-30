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
    print("Starting Argos Translate model installation...")
    
    try:
        installed = arg_translate.get_installed_languages()
        installed_codes = {getattr(l, 'code', '') for l in installed}
        print(f"  Currently installed languages: {installed_codes}")
    except Exception as e:
        print(f"  Error checking installed languages: {e}")
        installed_codes = set()

    needed = {"pt", "es"}
    present = set()
    for code in installed_codes:
        if not code:
            continue
        normalized = code.split('_')[0].split('-')[0]
        present.add(normalized)

    missing = needed - present
    if not missing:
        print(f"  All required Argos models already installed: {present}")
        return

    print(f"  Missing Argos models: {missing} — attempting to download/install")

    try:
        available = arg_package.get_available_packages()
        print(f"  Found available Argos packages")
    except Exception as e:
        print(f"  Failed to get available Argos packages: {e}")
        return

    for pkg in available:
        try:
            from_code = getattr(pkg, 'from_code', '')
            to_code = getattr(pkg, 'to_code', '')
            if from_code.startswith('en') and to_code in missing:
                print(f"  Downloading and installing {from_code} -> {to_code}")
                import os
                tmpfile = tempfile.NamedTemporaryFile(delete=False)
                tmpfile.close()
                urllib.request.urlretrieve(pkg.download_url, tmpfile.name)
                arg_package.install_from_path(tmpfile.name)
                os.unlink(tmpfile.name)
                print(f"    Successfully installed {from_code}->{to_code}")
                missing.discard(to_code)
                if not missing:
                    break
        except Exception as e:
            print(f"  Error installing {getattr(pkg, 'from_code', '?')}->{getattr(pkg, 'to_code', '?')}: {e}")

    if missing:
        print(f"  Warning: Some Argos models remain missing: {missing}")
    else:
        print("  Argos Translate models installed successfully.")


if __name__ == '__main__':
    main()
