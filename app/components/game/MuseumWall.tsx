"use client";
import { useEffect, useRef, useState } from "react";
import {
  MUSEUM_DEFAULT_PLACEMENTS,
  MUSEUM_FALLBACK_ART,
  type MuseumArtwork,
  type MuseumSlot,
} from "./config";
import {
  arrangeMuseumSlots,
  chooseMuseumSlotCount,
  createMuseumPlacement,
  museumArtworkCrop,
  museumBackgroundWorkPaused,
  museumSlotRange,
  shuffleMuseumQueue,
} from "./museum-layout";

export function MuseumWall() {
  const [artworks, setArtworks] =
    useState<MuseumArtwork[]>(MUSEUM_FALLBACK_ART);
  const [slots, setSlots] = useState<MuseumSlot[]>(
    MUSEUM_FALLBACK_ART.map((_, artIndex) => ({
      artIndex,
      phase: "arriving",
      placement: MUSEUM_DEFAULT_PLACEMENTS[artIndex],
    })),
  );
  const wallRef = useRef<HTMLElement>(null);
  const slotsRef = useRef(slots);
  const boundsRef = useRef({ width: 520, height: 650 });
  const hasMeasuredRef = useRef(false);

  useEffect(() => {
    let active = true;
    import("../../lib/canvas-data").then(({ CANVASES }) => {
      if (!active) return;
      const completeCollection = CANVASES.map(
        ({ id, title, artist, year, image, aspectRatio }) => ({
          id,
          title,
          artist,
          year,
          image,
          aspectRatio,
        }),
      );
      setSlots((current) =>
        current.map((slot) => {
          const fallback = MUSEUM_FALLBACK_ART[slot.artIndex];
          if (!fallback) {
            return {
              ...slot,
              artIndex: Math.min(
                Math.max(slot.artIndex, 0),
                completeCollection.length - 1,
              ),
              phase: "resting",
            };
          }
          const artIndex = completeCollection.findIndex(
            (artwork) => artwork.id === fallback.id,
          );
          return {
            artIndex: artIndex >= 0 ? artIndex : 0,
            phase: "resting",
            placement: slot.placement,
          };
        }),
      );
      setArtworks(completeCollection);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);

  useEffect(() => {
    const wall = wallRef.current;
    if (!wall) return;

    const updateLayout = (width: number, height: number, force = false) => {
      if (width < 1 || height < 1) return;
      const previous = boundsRef.current;
      if (
        !force &&
        hasMeasuredRef.current &&
        Math.abs(previous.width - width) < 8 &&
        Math.abs(previous.height - height) < 8
      ) {
        return;
      }
      const bounds = { width, height };
      hasMeasuredRef.current = true;
      boundsRef.current = bounds;
      setSlots((current) => {
        const next = arrangeMuseumSlots(
          current,
          chooseMuseumSlotCount(bounds, artworks.length),
          artworks,
          bounds,
        );
        slotsRef.current = next;
        return next;
      });
    };

    const observer = new ResizeObserver(([entry]) => {
      updateLayout(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(wall);
    updateLayout(wall.clientWidth, wall.clientHeight, true);

    return () => observer.disconnect();
  }, [artworks]);

  useEffect(() => {
    if (artworks.length <= MUSEUM_FALLBACK_ART.length) return;
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;

    const scheduleRehang = () => {
      timer = setTimeout(
        () => {
          if (stopped) return;
          if (museumBackgroundWorkPaused()) {
            scheduleRehang();
            return;
          }
          const bounds = boundsRef.current;
          const range = museumSlotRange(bounds);
          setSlots((current) => {
            const availableCounts = Array.from(
              {
                length:
                  Math.min(range.maximum, artworks.length) - range.minimum + 1,
              },
              (_, index) => range.minimum + index,
            ).filter((count) => count !== current.length);
            const count =
              availableCounts[
                Math.floor(Math.random() * availableCounts.length)
              ] ?? current.length;
            const next = arrangeMuseumSlots(
              current,
              count,
              artworks,
              bounds,
            );
            slotsRef.current = next;
            return next;
          });
          scheduleRehang();
        },
        12000 + Math.random() * 14000,
      );
    };

    scheduleRehang();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [artworks]);

  const museumSlotCount = slots.length;

  useEffect(() => {
    if (artworks.length <= MUSEUM_FALLBACK_ART.length) return;
    let stopped = false;
    let queue: number[] = [];
    const timers = new Set<ReturnType<typeof setTimeout>>();

    const setTrackedTimeout = (callback: () => void, delay: number) => {
      const timer = setTimeout(() => {
        timers.delete(timer);
        callback();
      }, delay);
      timers.add(timer);
    };

    const refillQueue = () => {
      const visible = new Set(
        slotsRef.current.map((slot) => slot.artIndex),
      );
      queue = shuffleMuseumQueue(
        artworks
          .map((_, index) => index)
          .filter((index) => !visible.has(index)),
      );
    };

    const nextArtwork = () => {
      if (queue.length === 0) refillQueue();
      return queue.shift() ?? 0;
    };

    const updateSlot = (
      slotIndex: number,
      update: (slot: MuseumSlot) => MuseumSlot,
    ) => {
      setSlots((current) => {
        const next = current.map((slot, index) =>
          index === slotIndex ? update(slot) : slot,
        );
        slotsRef.current = next;
        return next;
      });
    };

    const scheduleChange = (slotIndex: number, firstChange = false) => {
      const baseDelay = firstChange ? 2800 : 5200;
      const irregularDelay =
        baseDelay + Math.random() * 6500 + slotIndex * 730;
      setTrackedTimeout(() => {
        if (stopped) return;
        if (museumBackgroundWorkPaused()) {
          scheduleChange(slotIndex);
          return;
        }
        const artIndex = nextArtwork();
        const preload = new Image();
        preload.src = artworks[artIndex].image;
        updateSlot(slotIndex, (slot) => ({
          ...slot,
          phase: "departing",
        }));
        setTrackedTimeout(() => {
          if (stopped) return;
          updateSlot(slotIndex, (slot) => ({
            artIndex,
            phase: "arriving",
            placement: createMuseumPlacement(
              artworks[artIndex],
              boundsRef.current,
              slot.placement.band,
              slotsRef.current.length,
            ),
          }));
          setTrackedTimeout(() => {
            if (stopped) return;
            updateSlot(slotIndex, (slot) => ({
              ...slot,
              phase: "resting",
            }));
            scheduleChange(slotIndex);
          }, 1150);
        }, 720);
      }, irregularDelay);
    };

    refillQueue();
    Array.from({ length: museumSlotCount }, (_, slotIndex) =>
      scheduleChange(slotIndex, true),
    );

    return () => {
      stopped = true;
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [artworks, museumSlotCount]);

  return (
    <section
      className="museum-wall"
      aria-label="Rotating museum collection"
      ref={wallRef}
    >
      <span className="museum-wall-light" aria-hidden="true" />
      {slots.map((slot, slotIndex) => {
        const artwork = artworks[slot.artIndex] ?? MUSEUM_FALLBACK_ART[0];
        const artworkCrop = museumArtworkCrop(artwork);
        return (
          <figure
            className={`museum-piece museum-piece-${slotIndex + 1} ${slot.phase}`}
            key={slotIndex}
            style={
              {
                "--museum-art-ratio": artworkCrop.aspectRatio,
                "--museum-x": `${slot.placement.x}px`,
                "--museum-y": `${slot.placement.y}px`,
                "--museum-art-width": `${slot.placement.artWidth}px`,
                "--museum-art-height": `${slot.placement.artHeight}px`,
                "--museum-placard-width": `${slot.placement.placardWidth}px`,
                "--museum-gap": `${slot.placement.gap}px`,
                "--hang-tilt": `${slot.placement.tilt}deg`,
                "--museum-image-width": `${artworkCrop.imageWidth}%`,
                "--museum-image-height": `${artworkCrop.imageHeight}%`,
                "--museum-image-left": `${artworkCrop.imageLeft}%`,
                "--museum-image-top": `${artworkCrop.imageTop}%`,
                flexDirection: slot.placement.reverse ? "row-reverse" : "row",
              } as React.CSSProperties
            }
          >
            <div className="museum-frame">
              <div className="museum-art">
                <img
                  src={artwork.image}
                  alt={`${artwork.title} by ${artwork.artist}`}
                />
              </div>
            </div>
            <figcaption className="museum-placard">
              <strong>{artwork.title}</strong>
              <span>{artwork.artist}</span>
              {artwork.year && <small>{artwork.year}</small>}
            </figcaption>
          </figure>
        );
      })}
      <span className="museum-floor-line" aria-hidden="true" />
    </section>
  );
}

