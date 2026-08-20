-- Corpus conversion metadata (feat/corpus-convert): the list table and detail
-- page read typed metadata off each document; the convert flow inserts a
-- terminal successful row carrying it. Column names follow the corpora-py
-- contract (source_format = POST /convert field, corpus_type = manifest
-- "type", nodes/words from the validation CorpusStats). All nullable so
-- legacy rows degrade to "—" in the UI. No UPDATE policy: conversion only
-- ever inserts; failures persist nothing.

alter table public.corpus_documents
  add column if not exists corpus_type   text,
  add column if not exists source_format text,
  add column if not exists licence       text,
  add column if not exists language      text,
  add column if not exists size_bytes    bigint,
  add column if not exists docs_count    integer,
  add column if not exists nodes         integer,
  add column if not exists words         integer,
  add column if not exists status        text check (status in ('converted','uploaded')),
  add column if not exists converted_at  timestamptz;
