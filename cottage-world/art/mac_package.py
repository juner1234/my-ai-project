"""Prepare official ARM64 templates and validate/repackage a Godot macOS export.

No Apple certificate is used: the exported app has an ad-hoc signature only.
"""
import argparse
import hashlib
import io
import plistlib
import struct
import zipfile
from pathlib import Path

TEMPLATE_SHA512 = 'da606b61c10157844f8300172df374472665f95015495cb1a7cd132c40ede404faa96cc1016a4b9662db9909ddea69632c4948b2cd11163438dad4808881fb68'


def arm_template(source, destination):
    with source.open('rb') as stream:
        if hashlib.file_digest(stream, 'sha512').hexdigest() != TEMPLATE_SHA512:
            raise ValueError('Official 4.6.3 template SHA512 mismatch')
    with zipfile.ZipFile(source) as tpz:
        archive = tpz.read('templates/macos.zip')
    destination.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(io.BytesIO(archive)) as src, zipfile.ZipFile(destination, 'w', zipfile.ZIP_DEFLATED, 6) as out:
        for info in src.infolist():
            data = src.read(info)
            if info.filename.endswith('.universal'):
                magic, count = struct.unpack_from('>II', data)
                assert magic == 0xcafebabe
                for index in range(count):
                    cpu, subtype, offset, size, align = struct.unpack_from('>IIIII', data, 8 + index * 20)
                    if cpu == 0x0100000c:
                        data = data[offset:offset + size]
                        info.filename = info.filename.replace('.universal', '.arm64')
                        break
                else:
                    raise ValueError('ARM64 slice missing')
            out.writestr(info, data)


def validate(source):
    with zipfile.ZipFile(source) as archive:
        assert archive.testzip() is None
        plist_path = next(n for n in archive.namelist() if n.endswith('/Contents/Info.plist'))
        root = plist_path.removesuffix('Info.plist')
        plist = plistlib.loads(archive.read(plist_path))
        assert plist['CFBundleIdentifier'] == 'com.juner1234.mosslightvilla'
        binary_path = root + 'MacOS/' + plist['CFBundleExecutable']
        info = archive.getinfo(binary_path)
        assert (info.external_attr >> 16) & 0o111, 'Not executable'
        binary = archive.read(info)
        assert struct.unpack_from('<II', binary) == (0xfeedfacf, 0x0100000c)
        commands = struct.unpack_from('<I', binary, 16)[0]
        at = 32
        signature = None
        for _ in range(commands):
            command, size = struct.unpack_from('<II', binary, at)
            if command == 0x1d:
                offset, length = struct.unpack_from('<II', binary, at + 8)
                signature = binary[offset:offset + length]
            at += size
        assert signature is not None, 'Missing ARM code signature'
        magic, length, count = struct.unpack_from('>III', signature)
        assert magic == 0xfade0cc0
        checked = 0
        for index in range(count):
            kind, offset = struct.unpack_from('>II', signature, 12 + index * 8)
            if kind != 0:
                continue
            cd = signature[offset:]
            magic, length, version, flags, hashes, ident, special, pages, limit = struct.unpack_from('>9I', cd)
            assert magic == 0xfade0c02 and flags & 2, 'Expected ad-hoc signature'
            hash_size, hash_type, platform, page_power = struct.unpack_from('4B', cd, 36)
            algorithm = {1: 'sha1', 2: 'sha256', 3: 'sha256', 4: 'sha384'}[hash_type]
            page_size = 1 << page_power
            for page in range(pages):
                raw = binary[page * page_size:min((page + 1) * page_size, limit)]
                digest = hashlib.new(algorithm, raw).digest()[:hash_size]
                assert digest == cd[hashes + page * hash_size:hashes + (page + 1) * hash_size], 'Code page hash mismatch'
            for slot, resource in [(1, plist_path), (3, root + '_CodeSignature/CodeResources')]:
                if slot <= special:
                    expected = cd[hashes - slot * hash_size:hashes - (slot - 1) * hash_size]
                    if any(expected):
                        assert hashlib.new(algorithm, archive.read(resource)).digest()[:hash_size] == expected, 'Signed resource hash mismatch'
            checked += 1
        assert checked, 'No code directory'
        pack = next(n for n in archive.namelist() if n.endswith('.pck'))
        assert archive.getinfo(pack).file_size > 1000000
    return {'arm64': True, 'zip_integrity': True, 'adhoc_code_hashes': True, 'notarized': False}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=['template', 'validate'])
    parser.add_argument('source', type=Path)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    if args.mode == 'template':
        if not args.output:
            parser.error('template requires --output')
        arm_template(args.source, args.output)
    else:
        print(validate(args.source))
