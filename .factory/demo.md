# Catch Photo Log demo sandbox

## Open the demo

Open `/demo` or `/?demo=1`. The landing page also has **Try it with sample data** as its first action.

The demo starts with three opinionated records: a smallmouth bass on a Ned rig, a rainbow trout on an inline spinner, and a channel catfish on a slip sinker rig. Their exact, approximate, and removed-location examples make the catch cards useful immediately.

## Isolation and reset

Real records use IndexedDB database `catch-photo-log`. Demo records use the separate `demo:catch-photo-log` database. Demo mode never reads or writes the real record database.

The persistent banner says **Demo — sample data, nothing is saved**. **Reset demo** clears and reseeds only `demo:catch-photo-log`. **Start for real** clears the demo database before returning to `/`; it never copies sample records into a real log.

The sample records are bundled in the application code, so the demo can be opened after the PWA shell has been cached for offline use.
