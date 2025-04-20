"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Layers, ChevronUp, ChevronDown } from "lucide-react";

// Types for the component
export interface BoxData {
  label: string;
  box: [number, number, number, number]; // [xA, yA, xB, yB]
}

export interface ImageData {
  [key: number]: BoxData;
}

export interface InteractiveImageViewerProps {
  // Image properties
  imageSrc: string;
  imageAlt?: string;
  imageWidth: number;
  imageHeight: number;

  // Data
  detectionData: ImageData;

  // Optional customization
  className?: string;
  showFilterPanel?: boolean;
  title?: string;

  // Optional callbacks
  onBoxRemoved?: (id: number) => void;
  onFiltersChanged?: (selectedLabels: string[]) => void;
  onBoxAdded?: (boxData: BoxData) => void;
}

// Helper function to check if a point is inside a box
function isPointInBox(
  x: number,
  y: number,
  box: [number, number, number, number]
): boolean {
  const [xA, yA, xB, yB] = box;
  return x >= xA && x <= xB && y >= yA && y <= yB;
}

export function InteractiveImageViewer({
  imageSrc,
  imageAlt = "Object detection result",
  imageWidth,
  imageHeight,
  detectionData,
  className = "",
  showFilterPanel = true,
  title = "Interactive Image Viewer",
  onBoxRemoved,
  onFiltersChanged,
  onBoxAdded,
}: InteractiveImageViewerProps) {
  const [visibleBoxes, setVisibleBoxes] = useState<number[]>([]);
  const [uniqueLabels, setUniqueLabels] = useState<string[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [hoveredBox, setHoveredBox] = useState<number | null>(null);
  const [selectedBox, setSelectedBox] = useState<number | null>(null);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<[number, number] | null>(null);
  const [drawEnd, setDrawEnd] = useState<[number, number] | null>(null);
  const [isAddingLabel, setIsAddingLabel] = useState(false);
  const [newBoxLabel, setNewBoxLabel] = useState("");
  const [drawingMode, setDrawingMode] = useState(false);

  // Initialize visible boxes and unique labels
  useEffect(() => {
    if (!detectionData) return;

    const boxIds = Object.keys(detectionData).map(Number);
    setVisibleBoxes(boxIds);

    const labels = [
      ...new Set(Object.values(detectionData).map((item) => item.label)),
    ];
    setUniqueLabels(labels);
    setSelectedLabels(labels); // Initially select all labels
  }, [detectionData]);

  // Notify parent when filters change
  useEffect(() => {
    onFiltersChanged?.(selectedLabels);
  }, [selectedLabels, onFiltersChanged]);

  // Remove a box
  const removeBox = (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the box click event from triggering
    setVisibleBoxes(visibleBoxes.filter((boxId) => boxId !== id));
    if (selectedBox === id) {
      setSelectedBox(null);
    }
    onBoxRemoved?.(id);
  };

  // Toggle a label filter
  const toggleLabel = (label: string) => {
    const newSelectedLabels = selectedLabels.includes(label)
      ? selectedLabels.filter((l) => l !== label)
      : [...selectedLabels, label];

    setSelectedLabels(newSelectedLabels);
  };

  // Filter boxes based on selected labels
  const filteredBoxes = visibleBoxes.filter(
    (id) =>
      detectionData &&
      detectionData[id] &&
      selectedLabels.includes(detectionData[id].label)
  );

  // Handle image click to find and cycle through overlapping boxes
  const handleImageClick = (e: React.MouseEvent) => {
    if (!imageRef.current) return;

    // Get click coordinates relative to the image
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * imageWidth;
    const y = ((e.clientY - rect.top) / rect.height) * imageHeight;

    // Find all boxes that contain this point
    const boxesAtPoint = filteredBoxes.filter((id) => {
      return isPointInBox(x, y, detectionData[id].box);
    });

    if (boxesAtPoint.length === 0) {
      // If no boxes at this point, clear selection
      setSelectedBox(null);
    } else if (boxesAtPoint.length === 1) {
      // If only one box, select/deselect it
      setSelectedBox(selectedBox === boxesAtPoint[0] ? null : boxesAtPoint[0]);
    } else {
      // If multiple boxes, cycle through them
      const currentIndex = boxesAtPoint.indexOf(selectedBox as number);
      const nextIndex = (currentIndex + 1) % boxesAtPoint.length;
      setSelectedBox(boxesAtPoint[nextIndex]);
    }
  };

  // Handle mouse down to start drawing
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!drawingMode || !imageRef.current) return;

    // Get coordinates relative to the image
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * imageWidth;
    const y = ((e.clientY - rect.top) / rect.height) * imageHeight;

    setIsDrawing(true);
    setDrawStart([x, y]);
    setDrawEnd([x, y]);
  };

  // Handle mouse move while drawing
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !imageRef.current) return;

    // Get coordinates relative to the image
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * imageWidth;
    const y = ((e.clientY - rect.top) / rect.height) * imageHeight;

    setDrawEnd([x, y]);
  };

  // Handle mouse up to finish drawing
  const handleMouseUp = () => {
    if (!isDrawing) return;

    setIsDrawing(false);

    // Only show label input if we've drawn a box of reasonable size
    if (drawStart && drawEnd) {
      const width = Math.abs(drawEnd[0] - drawStart[0]);
      const height = Math.abs(drawEnd[1] - drawStart[1]);

      if (width > 10 && height > 10) {
        setIsAddingLabel(true);
      } else {
        // Reset if the box is too small
        setDrawStart(null);
        setDrawEnd(null);
      }
    }
  };

  // Move a box up or down in the stacking order
  const moveBoxInStack = (id: number, direction: "up" | "down") => {
    // This is a visual effect only - we're just changing the selected box
    // to bring it to the front or send it to the back
    setSelectedBox(id);
  };

  // Add a new box with label
  const addNewBox = () => {
    if (!drawStart || !drawEnd || !newBoxLabel.trim() || !detectionData) return;

    // Create box coordinates in the format [xA, yA, xB, yB]
    const box: [number, number, number, number] = [
      Math.min(drawStart[0], drawEnd[0]),
      Math.min(drawStart[1], drawEnd[1]),
      Math.max(drawStart[0], drawEnd[0]),
      Math.max(drawStart[1], drawEnd[1]),
    ];

    // Create new box data
    const newBox: BoxData = {
      label: newBoxLabel.trim(),
      box: box,
    };

    // Generate a new unique ID (max ID + 1)
    const newId =
      Math.max(0, ...Object.keys(detectionData || {}).map(Number)) + 1;

    // Add to detection data (this would typically be handled by the parent component)
    const updatedData = {
      ...detectionData,
      [newId]: newBox,
    };

    // Update local state
    if (!uniqueLabels.includes(newBoxLabel)) {
      setUniqueLabels([...uniqueLabels, newBoxLabel]);
      setSelectedLabels([...selectedLabels, newBoxLabel]);
    }

    // Add to visible boxes
    setVisibleBoxes([...visibleBoxes, newId]);

    // Notify parent component
    onBoxAdded?.(newBox);

    // Reset drawing state
    setDrawStart(null);
    setDrawEnd(null);
    setNewBoxLabel("");
    setIsAddingLabel(false);
  };

  return (
    <div className={`w-full ${className}`}>
      {title && <h2 className="text-xl font-bold mb-4">{title}</h2>}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Filter controls */}
        {showFilterPanel && (
          <div className="w-full md:w-64 space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">Filter by Label</h3>
              <div className="space-y-2">
                {uniqueLabels.map((label) => (
                  <div key={label} className="flex items-center space-x-2">
                    <Checkbox
                      id={`label-${label}`}
                      checked={selectedLabels.includes(label)}
                      onCheckedChange={() => toggleLabel(label)}
                    />
                    <label
                      htmlFor={`label-${label}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {label}
                    </label>
                  </div>
                ))}
              </div>

              <div className="mt-4 text-sm text-gray-500">
                Showing {filteredBoxes.length} of{" "}
                {detectionData ? Object.keys(detectionData).length : 0} detected
                objects
              </div>
            </div>

            {/* Layer panel toggle button */}
            <button
              className="flex items-center gap-2 text-sm font-medium px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg w-full"
              onClick={() => setShowLayerPanel(!showLayerPanel)}
            >
              <Layers size={16} />
              {showLayerPanel ? "Hide Layers Panel" : "Show Layers Panel"}
            </button>

            {/* Layers panel */}
            {showLayerPanel && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Layers</h3>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {filteredBoxes.map((id) => {
                    const { label } = detectionData[id];
                    const labelHash = label
                      .split("")
                      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
                    const hue = labelHash % 360;

                    return (
                      <div
                        key={id}
                        className={`flex items-center justify-between p-2 rounded text-xs ${
                          selectedBox === id
                            ? "bg-gray-200"
                            : "hover:bg-gray-100"
                        }`}
                        onClick={() => setSelectedBox(id)}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-sm"
                            style={{ backgroundColor: `hsl(${hue}, 70%, 50%)` }}
                          ></div>
                          <span className="truncate max-w-[120px]">
                            {label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveBoxInStack(id, "up");
                            }}
                            className="p-1 hover:bg-gray-200 rounded"
                            title="Bring to front"
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveBoxInStack(id, "down");
                            }}
                            className="p-1 hover:bg-gray-200 rounded"
                            title="Send to back"
                          >
                            <ChevronDown size={14} />
                          </button>
                          <button
                            onClick={(e) => removeBox(id, e)}
                            className="p-1 hover:bg-gray-200 rounded text-red-500"
                            title="Remove"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Image with bounding boxes */}
        <div className="flex-1 relative">
          <div
            ref={imageRef}
            className="relative border border-gray-200 rounded-lg overflow-hidden"
            onClick={drawingMode ? undefined : handleImageClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => isDrawing && setIsDrawing(false)}
          >
            {/* The image */}
            <img
              src={imageSrc || "/placeholder.svg"}
              alt={imageAlt}
              className="w-full h-auto"
              draggable="false"
            />

            {/* Drawing overlay */}
            {drawingMode && drawStart && drawEnd && (
              <div
                className="absolute border-2 border-dashed border-blue-500 bg-blue-100/30 pointer-events-none"
                style={{
                  left: `${
                    (Math.min(drawStart[0], drawEnd[0]) / imageWidth) * 100
                  }%`,
                  top: `${
                    (Math.min(drawStart[1], drawEnd[1]) / imageHeight) * 100
                  }%`,
                  width: `${
                    (Math.abs(drawEnd[0] - drawStart[0]) / imageWidth) * 100
                  }%`,
                  height: `${
                    (Math.abs(drawEnd[1] - drawStart[1]) / imageHeight) * 100
                  }%`,
                  zIndex: 2000,
                }}
              />
            )}

            {/* Bounding boxes */}
            {filteredBoxes.map((id) => {
              const { label, box } = detectionData[id];
              const [xA, yA, xB, yB] = box;

              // Calculate position and size as percentages for responsive scaling
              const left = (xA / imageWidth) * 100;
              const top = (yA / imageHeight) * 100;
              const width = ((xB - xA) / imageWidth) * 100;
              const height = ((yB - yA) / imageHeight) * 100;

              // Generate a consistent color based on the label
              const labelHash = label
                .split("")
                .reduce((acc, char) => acc + char.charCodeAt(0), 0);
              const hue = labelHash % 360;

              // Determine if this box is selected or hovered
              const isSelected = selectedBox === id;
              const isHovered = hoveredBox === id;

              // Set z-index - selected boxes should be on top
              const zIndex = isSelected ? 1000 : isHovered ? 500 : 1;

              return (
                <div
                  key={id}
                  className="absolute border-2 flex flex-col items-start transition-all duration-150"
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    width: `${width}%`,
                    height: `${height}%`,
                    borderColor: isSelected
                      ? `hsl(${hue}, 70%, 50%)`
                      : `hsla(${hue}, 70%, 50%, ${isHovered ? 1 : 0.7})`,
                    borderWidth: isSelected ? "3px" : "2px",
                    zIndex: zIndex,
                    boxShadow: isSelected
                      ? `0 0 0 2px rgba(255,255,255,0.5), 0 0 0 4px hsl(${hue}, 70%, 50%)`
                      : isHovered
                      ? `0 0 0 1px rgba(255,255,255,0.3), 0 0 0 2px hsla(${hue}, 70%, 50%, 0.5)`
                      : "none",
                    cursor: "pointer",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedBox(isSelected ? null : id);
                  }}
                  onMouseEnter={() => setHoveredBox(id)}
                  onMouseLeave={() => setHoveredBox(null)}
                >
                  <div
                    className="text-xs font-medium px-1 py-0.5 rounded-sm flex items-center"
                    style={{
                      backgroundColor: `hsl(${hue}, 70%, 50%)`,
                      color: `hsl(${hue}, 70%, 95%)`,
                      zIndex: zIndex + 1, // Ensure label is above the box
                    }}
                  >
                    {label}
                    <button
                      onClick={(e) => removeBox(id, e)}
                      className="ml-1 rounded-full hover:bg-white/20 p-0.5"
                      aria-label={`Remove ${label} box`}
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Drawing mode toggle button */}
          <div className="mt-4 flex justify-between items-center">
            <button
              className={`px-3 py-2 rounded-lg text-sm font-medium ${
                drawingMode
                  ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
              onClick={() => {
                setDrawingMode(!drawingMode);
                setSelectedBox(null);
                setDrawStart(null);
                setDrawEnd(null);
              }}
            >
              {drawingMode ? "Exit Drawing Mode" : "Add New Box"}
            </button>

            {drawingMode && (
              <div className="text-sm text-gray-500">
                Click and drag to draw a box
              </div>
            )}
          </div>

          {/* Label input modal */}
          {isAddingLabel && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
                <h3 className="text-lg font-bold mb-4">Add Label</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">
                    Label for the selected area:
                  </label>
                  <input
                    type="text"
                    value={newBoxLabel}
                    onChange={(e) => setNewBoxLabel(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter a label"
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md"
                    onClick={() => {
                      setIsAddingLabel(false);
                      setDrawStart(null);
                      setDrawEnd(null);
                      setNewBoxLabel("");
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={addNewBox}
                    disabled={!newBoxLabel.trim()}
                  >
                    Add Box
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 text-sm text-gray-500 space-y-1">
            <p>
              <strong>Click on the image</strong> to select boxes. When multiple
              boxes overlap, click again to cycle through them.
            </p>
            <p>
              <strong>Use the Layers Panel</strong> to select and manage boxes
              that might be hidden underneath others.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
