"use client";
import { CircleX, ImagePlus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { createNewHangout, ActionResponse, searchUsers } from "../actions";
import { OmilosUser, OmilosEvent } from "@/app/types";
import DatePicker from "@/app/components/DatePicker";
import Image from "next/image";
import { hangoutDetailsSchema } from "../schemas";
import Cropper, { Area, Point } from "react-easy-crop";
import { getCroppedImageFile } from "../cropImage";

type CreateHangoutModalProps = {
  isOpen: boolean,
  onClose: () => void
}

export function CreateHangoutModal({ isOpen, onClose }: CreateHangoutModalProps) {
  const router = useRouter();

  const initialState: ActionResponse<Partial<OmilosEvent>> = {
    success: false,
    data: {},
  }
  const [formState, formAction, pending] = useActionState(createNewHangout, initialState);
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<OmilosUser[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<OmilosUser[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

  // Tracks avatars that fail to load at runtime (expired/rotated CDN URLs, transient
  // network issues) so we can hide them instead of retrying or crashing. Kept even
  // though real Clerk image_urls are always well-formed, since a valid URL can still
  // fail to load; isValidImageUrl only screens out malformed/fake values up front.
  const [brokenImageIds, setBrokenImageIds] = useState<Set<number>>(new Set());
  const detailsResult = hangoutDetailsSchema.safeParse({ title, description, date });
  const isStep1Valid = detailsResult.success;

  const steps = [
    { id: 1, title: "Give your hangout some details" },
    { id: 2, title: "Who do you want to invite?" },
    { id: 3, title: "Add a fun cover image" }
  ]

  function nextStep() {
    setDirection(1)
    setStep(prev => Math.min(3, prev + 1))
  }

  function prevStep() {
    setDirection(-1)
    setStep(prev => Math.max(1, prev - 1))
  }


  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 500)
    return () => { clearTimeout(timer) }
  }, [searchQuery])

  useEffect(() => {
    if (!debouncedSearchQuery.trim()) {
      setSearchResults([])
      return
    }

    async function findUsers() {
      console.log("finding users that match: " + searchQuery)
      try {
        const res = await searchUsers(searchQuery)
        if (!res.success) {
          console.log("Failed to search users")
        }
        console.log("results: " + res.data)
        setSearchResults(res.data)
        setIsDropdownOpen(true)
      }
      catch (err) {
        console.log("Error searching users: " + err)
      }
    }

    findUsers();
  }, [debouncedSearchQuery])

  useEffect(() => {
    if (formState.success && formState.data.slug) {
      onClose()
      router.refresh()
    }
  }, [formState])

  function selectUser(user: OmilosUser) {
    setSelectedUsers(prev => prev.some(u => u.id === user.id) ? prev : [...prev, user])
    setSearchQuery("")
    setDebouncedSearchQuery("")
    setSearchResults([])
    setIsDropdownOpen(false)
  }

  function removeUser(userId: number) {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId))
  }

  function onSelectImage(file: File | null) {
    if (!file) return

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setImageError("Image must be smaller than 10MB")
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    setImageError(null)
    setCropSrc(URL.createObjectURL(file))
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
  }

  function cancelCrop() {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
  }

  async function confirmCrop() {
    if (!cropSrc || !croppedAreaPixels) return
    const cropped = await getCroppedImageFile(cropSrc, croppedAreaPixels, "cover.jpg")
    setImageFile(cropped)

    if (fileInputRef.current) {
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(cropped)
      fileInputRef.current.files = dataTransfer.files
    }

    URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
  }

  function displayName(user: OmilosUser) {
    const name = [user.first_name, user.last_name].filter(Boolean).join(" ")
    return name || user.email || "Unknown user"
  }

  // Guards against fake/malformed image_url values (e.g. test/seed data) that
  // would otherwise reach next/image and throw. Real Clerk users always have
  // a valid img.clerk.com URL, so this mainly matters for non-production data.
  function isValidImageUrl(url: string | undefined): url is string {
    if (!url) return false
    try {
      return new URL(url).hostname === "img.clerk.com"
    } catch {
      return false
    }
  }

  const stepVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Allows user to dismiss modal when they click outside box */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => onClose()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />

          {/* Modal box */}
          <motion.div
            className="h-[540px] w-full max-w-[540px] bg-bg-primary border-1 border-border-primary fixed top-1/2 left-1/2 rounded-2xl shadow-lg z-50 overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
            animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
            exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
            transition={{ duration: 0.15 }}
          >
            <div className="h-full flex flex-col overflow-y-auto pl-8 p-4 [scrollbar-gutter:stable]">
              {/* Dismiss modal button */}
              <section className="flex justify-end w-full">
                <button onClick={() => onClose()}><CircleX className="text-text-secondary" /></button>
              </section>

              {/* Multistep Form */}
              <form action={formAction}>
                <AnimatePresence mode="wait" custom={direction} initial={false}>
                  {
                    step === 1 &&
                    <motion.div
                      key="step-1"
                      custom={direction}
                      variants={stepVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.1, ease: "easeOut" }}
                      className="flex flex-col gap-8 h-full w-full justify-between mx-auto"
                    >
                      <h2 className="text-2xl text-left font-medium">{steps[step - 1].title}</h2>
                      <section className="flex flex-col gap-4">
                        <input
                          name="title"
                          placeholder="Title"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="bg-bg-secondary w-full rounded-md py-2 px-4"
                        />
                        <textarea
                          name="description"
                          placeholder="Description (optional)"
                          maxLength={600}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className="bg-bg-secondary w-full rounded-md py-2 px-4 min-h-48 resize-none overflow-y-auto"
                        />
                        <DatePicker
                          value={date}
                          onChange={setDate}
                          className="bg-bg-secondary w-full rounded-md py-2 px-4 flex items-center justify-between gap-3 text-sm text-text-primary hover:bg-bg-secondary/70"
                        />
                        <input type="hidden" name="date" value={date ? date.toISOString() : ""} />
                      </section>


                      <button
                        type="button"
                        onClick={nextStep}
                        disabled={!isStep1Valid}
                        className="bg-text-primary text-text-inverse px-4 py-2 rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Continue
                      </button>
                    </motion.div>
                  }

                  {
                    step === 2 &&
                    <motion.div
                      key="step-2"
                      custom={direction}
                      variants={stepVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.1, ease: "easeOut" }}
                      className="flex flex-col gap-12 w-full justify-center mx-auto"
                    >
                      <h2 className="text-2xl text-center font-medium">{steps[step - 1].title}</h2>
                      <section className="flex flex-col gap-4">
                        {/* Step 1's fields unmount when this step is shown; mirror them
                            here so they're still present in FormData on submit. */}
                        <input type="hidden" name="title" value={title} />
                        <input type="hidden" name="description" value={description} />
                        <input type="hidden" name="date" value={date ? date.toISOString() : ""} />

                        <div className="relative">
                          <input
                            placeholder="Search users"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => searchResults.length > 0 && setIsDropdownOpen(true)}
                            onBlur={() => setTimeout(() => setIsDropdownOpen(false), 150)}
                            className="bg-bg-secondary w-full rounded-md p-2"
                            autoComplete="off"
                          />

                          {isDropdownOpen && searchResults.length > 0 && (
                            <ul className="absolute top-full left-0 right-0 mt-1 bg-bg-primary border border-border-primary rounded-md shadow-lg max-h-48 overflow-y-auto z-10">
                              {searchResults.map(u => (
                                <li key={u.id}>
                                  <button
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => selectUser(u)}
                                    className="w-full text-left px-3 py-2 text-text-primary hover:bg-bg-secondary"
                                  >
                                    {displayName(u)}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        {selectedUsers.map(u => (
                          <input key={u.id} type="hidden" name="inviteeIds" value={u.id} />
                        ))}

                        {/* Selected user pill list */}
                        <section className="flex flex-wrap gap-2">
                          <AnimatePresence initial={false}>
                            {selectedUsers.map(u => (
                              <motion.div
                                key={u.id}
                                layout
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1, transition: { type: "spring", stiffness: 500, damping: 15, duration: 0.1 } }}
                                exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.1 } }}
                                className="flex items-center gap-1 bg-bg-secondary text-text-primary text-sm rounded-full py-1 pl-3 pr-2"
                              >
                                {isValidImageUrl(u.image_url) && !brokenImageIds.has(u.id) && (
                                  <Image
                                    width={16}
                                    height={16}
                                    className="rounded-full"
                                    alt="user profile"
                                    src={u.image_url}
                                    onError={() => setBrokenImageIds(prev => new Set(prev).add(u.id))}
                                  />
                                )}
                                {displayName(u)}
                                <button
                                  type="button"
                                  onClick={() => removeUser(u.id)}
                                  className="text-text-secondary hover:text-text-primary hover:cursor-pointer"
                                >
                                  <X size={14} />
                                </button>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </section>
                        <button
                          type="button"
                          onClick={nextStep}
                          disabled={!isStep1Valid}
                          className="bg-text-primary text-text-inverse p-2 rounded-md disabled:opacity-40 disabled:cursor-not-allowed mt-12"
                        >
                          Next
                        </button>
                        <button
                          type="button"
                          onClick={prevStep}
                          disabled={!isStep1Valid}
                          className="bg-bg-secondary text-text-primary p-2 rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Back
                        </button>
                      </section>
                    </motion.div>
                  }

                  {
                    step === 3 &&
                    <motion.div
                      key="step-3"
                      custom={direction}
                      variants={stepVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.1, ease: "easeOut" }}
                      className="flex flex-col gap-6 h-full w-full justify-between mx-auto"
                    >

                      <h2 className="text-2xl text-center font-medium">{steps[step - 1].title}</h2>
                      <input type="hidden" name="title" value={title} />
                      <input type="hidden" name="description" value={description} />
                      <input type="hidden" name="date" value={date ? date.toISOString() : ""} />
                      {selectedUsers.map(u => (
                        <input key={u.id} type="hidden" name="inviteeIds" value={u.id} />
                      ))}
                      <section className={`flex flex-col gap-4 ${cropSrc ? "invisible" : ""}`}>
                        <label
                          htmlFor="coverImage"
                          className="w-full aspect-video bg-bg-secondary flex flex-col gap-2 justify-center items-center rounded-lg border-1 border-dashed border-border-primary cursor-pointer hover:bg-bg-secondary/70 overflow-hidden"
                        >
                          {imageFile ? (
                            <Image
                              src={URL.createObjectURL(imageFile)}
                              alt="Cover preview"
                              width={480}
                              height={270}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <>
                              <ImagePlus className="text-text-secondary" size={28} />
                              <span className="text-sm text-text-secondary">
                                Click to upload a cover image
                              </span>
                            </>
                          )}
                        </label>
                        <input
                          ref={fileInputRef}
                          id="coverImage"
                          name="coverImage"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => onSelectImage(e.target.files ? e.target.files[0] : null)}
                        />
                        {imageError && (
                          <p className="text-sm text-red-500">{imageError}</p>
                        )}

                        {cropSrc && createPortal(
                          <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 p-6">
                            <div className="relative w-full max-w-md aspect-video bg-bg-secondary rounded-lg overflow-hidden">
                              <Cropper
                                image={cropSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={16 / 9}
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
                              />
                            </div>
                            <input
                              type="range"
                              min={1}
                              max={3}
                              step={0.1}
                              value={zoom}
                              onChange={(e) => setZoom(Number(e.target.value))}
                              className="w-full max-w-md accent-text-primary"
                            />
                            <div className="flex gap-3">
                              <button
                                type="button"
                                onClick={cancelCrop}
                                className="bg-bg-secondary text-text-primary px-4 py-2 rounded-md"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={confirmCrop}
                                className="bg-text-primary text-text-inverse px-4 py-2 rounded-md"
                              >
                                Confirm crop
                              </button>
                            </div>
                          </div>,
                          document.body
                        )}
                      </section>
                      <div className={`flex flex-col gap-2 ${cropSrc ? "invisible" : ""}`}>
                        <button
                          type="submit"
                          disabled={pending}
                          className="bg-text-primary text-text-inverse p-2 rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {pending ? "...Submitting" : "Submit"}
                        </button>
                        <button
                          type="button"
                          onClick={prevStep}
                          className="bg-bg-secondary text-text-primary p-2 rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Back
                        </button>
                      </div>
                    </motion.div>
                  }
                </AnimatePresence>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}