import React from "react";

/**
 * Ethiopian phone number regex:
 * Accepts: 0912345678, 0712345678, +251912345678, +251712345678
 */
export const ethioPhoneRegex = /^(\+251[97]|09|07)\d{8}$/;

/**
 * Letters-only regex (Latin + Ge'ez/Ethiopic characters, spaces, hyphens, apostrophes)
 */
export const lettersOnlyRegex = /^[A-Za-z\u1200-\u137F\u12A0-\u12FF\u1300-\u137F\s\-']+$/;

/**
 * Block digit keys (0-9) from being typed into an input.
 * Use on name fields, text-only fields, etc.
 */
export const blockNumbers = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  if (/^[0-9]$/.test(e.key)) e.preventDefault();
};

/**
 * Block letter keys from being typed into an input.
 * Use on phone fields, numeric-only fields.
 * Allows: digits, +, -, space, backspace, tab, arrows, delete
 */
export const blockLetters = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  if (/^[a-zA-Z\u1200-\u137F]$/.test(e.key)) {
    e.preventDefault();
  }
};

/**
 * Sanitize a string value by stripping digits.
 * Use in onChange handlers for name fields when onKeyDown is not enough
 * (e.g. paste events).
 */
export const stripNumbers = (value: string): string => {
  return value.replace(/[0-9]/g, "");
};

/**
 * Validate whether a value contains only letters (Latin + Ge'ez).
 */
export const isLettersOnly = (value: string): boolean => {
  return lettersOnlyRegex.test(value);
};
