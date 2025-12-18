# Canvas JSON Format

This document explains the canonical JSON structure expected for each canvas definition, which is stored in the database `canvases.layout_json` column and surfaces through the server API as a `CanvasDefinition`.

## Top-level object

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` (optional) | A stable identifier for the canvas. If absent or empty, the loader synthesizes `canvas-{row.id}` based on the database row. |
| `squares` | `Array` | **Required.** An ordered array of square descriptors that define the artwork grid. |

Note: Additional metadata such as `title`, `artist`, `year`, `starValue`, `paintValue`, `foodValue`, and `filename` are stored in separate columns on the `canvases` table and not in `layout_json`.

## Square descriptor

Each entry in the `squares` array must include:

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Unique within this canvas. If missing, the server generates `square-{index}`. |
| `position` | `object` | Pixel-style or grid coordinates: `{ "x": 0, "y": 0 }`. Defaults to `{ "x": index, "y": 0 }` when omitted. |
| `allowedColors` | `Array<string>` | List of allowed paint colors for the square. Valid colors come from `shared/types/common.ts`: `red`, `orange`, `yellow`, `green`, `blue`, `purple`, `black`, `wild`. Any invalid entries are ignored. |

### Position details

The server uses `position` to sort squares deterministically when initializing a `CanvasState`. Missing `position` objects default to consecutive `x` coordinates, and `y` defaults to `0`.

## Example layout JSON

```json
{
  "id": "sunrise-study",
  "squares": [
    {
      "id": "sunrise-1",
      "position": { "x": 0, "y": 0 },
      "allowedColors": ["red"]
    },
    {
      "id": "sunrise-2",
      "position": { "x": 1, "y": 0 },
      "allowedColors": ["orange", "yellow"]
    }
  ]
}
```

## Validation expectations

- `layout_json` must be valid JSON (objects or strings are accepted). Invalid or missing JSON causes the server to reject the canvas.
- The `squares` array must contain at least one entry. Otherwise the row is rejected with a descriptive error.
- `allowedColors` arrays are filtered to the canonical palette; duplicates are allowed but unnecessary.
- Every square’s `id` should be unique. The server auto-generates placeholder IDs for any missing values.

## Asset linking

The schema now exposes a `filename` column (e.g., `assets/canvases/sunrise-study.png`). When clients render canvases, they can pair this `filename` with the `CanvasDefinition` metadata returned by the server to load the reference image you authored.

Keep this document in sync with the schema (`sql/init-schema.sql`) and the loader logic in `server/src/db/canvases.ts`.
