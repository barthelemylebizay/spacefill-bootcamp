# Spacefill Import Tool

## What it does
An internal tool for Spacefill teammates who need to push order files (CSV or Excel) into the warehouse management system. You drop a file, the tool figures out how your columns map to Spacefill's fields, lets you review and fix anything, then sends the orders. It remembers your file formats so repeat imports are faster.

## Features
- 4-step import wizard: upload a file, confirm column mapping, validate rows, send to Spacefill
- Auto-detects saved mapping profiles using fuzzy matching — shows a green banner when it recognises a known file format
- Loads the full list of Spacefill fields (43 useful ones) plus any custom fields specific to each client
- Download CSV templates for shipments and receipts to use as a starting point
- Chat interface powered by GPT-4o for asking questions in plain language
- Dashboard, articles, charts, clients, feedbacks, and knowledge pages also present in the app

## What it remembers
- Mapping profiles: each time you save a column mapping, it's stored so the tool can recognise the same file format next time and pre-fill the mapping automatically

## Status
The import wizard and profile detection are solid. The chat feature works but requires an OpenAI key to be set up. The other pages (dashboard, charts, etc.) exist but their maturity varies.
