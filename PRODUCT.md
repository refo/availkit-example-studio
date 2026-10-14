# Appointment Studio

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React customer UI, Bun webhook receiver, registry-published @availkit/client and availkit CLI. Required by the issue.

## Users

External developers learning the public booking journey; customers selecting a service, staff, date, slot, then entering name and email.

## Product Purpose

A maintained independent sample showing an appointment request and signed webhook receipt using public packages.

## Capabilities and Constraints

One UTC location, two services, two staff. The browser receives a publishable test key only. Booking transitions and durable inspection are operator CLI operations. A bounded local in-memory event view is diagnostic, contains no customer payload, and is lost on restart. No database, admin dashboard, private imports, hidden provisioning, or production acceptance commands.

## Evidence on Hand

AK-19 accepted the published 0.1.1 packages and supplied the deterministic catalog. Brand assets have not been supplied.

## Open Decisions

Implementation assumption: use an understated appointment form with accessible native controls; no studio brand was supplied. No claim of a real commercial studio or hosted demo.
