# -*- coding: utf-8 -*-
from setuptools import setup, find_packages

with open('requirements.txt') as f:
	install_requires = f.read().strip().split('\n')

# get version from __version__ variable in global_app/__init__.py
from global_app import __version__ as version

setup(
	name='global_app',
	version=version,
	description='Global App',
	author='jan',
	author_email='jangeles@bai.ph',
	packages=find_packages(),
	zip_safe=False,
	include_package_data=True,
	install_requires=install_requires
)
