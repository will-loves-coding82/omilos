"use client";
import { CircleX } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useActionState, useState } from "react";
import { createNewHangout, ActionResponse } from "../actions";
import { hangoutDetailsSchema } from "../schemas";
import { Hangout } from "@/app/types";
import DatePicker from "@/app/components/DatePicker";

type CreateHangoutModalProps = {
  isOpen: boolean,
  onClose: () => void
}

export function CreateHangoutModal({isOpen, onClose}: CreateHangoutModalProps) {

  const initialState: ActionResponse<Hangout> = {
    success: false,
    data: { id: 0, title: '' },
  }
  const [formState, formAction, pending] = useActionState(createNewHangout, initialState);
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);

  const detailsResult = hangoutDetailsSchema.safeParse({ title, description, date });
  const isStep1Valid = detailsResult.success;

  const steps = [
    {id: 1, title: "Give your hangout some details"},
    {id: 2, title: "Who do you want to invite?"}
  ]

  function nextStep() {
    setDirection(1)
    setStep(prev => Math.min(2, prev + 1))
  }

  function prevStep() {
    setDirection(-1)
    setStep(prev => Math.max(1, prev - 1))
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
            className="h-[540px] w-full max-w-[600px] bg-bg-primary fixed top-1/2 left-1/2 rounded-2xl shadow-lg z-50 overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
            animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
            exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
            transition={{ duration: 0.15 }}
          >
            <div className="h-full flex flex-col overflow-y-auto pl-8 p-4 [scrollbar-gutter:stable]">
              {/* Dismiss modal button */}
              <section className="flex justify-end w-full">
                <button onClick={() => onClose()}><CircleX className="text-text-secondary"/></button>
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
                      transition={{ duration: 0.1, ease: "easeOut"}}
                      className="flex flex-col gap-8 h-full w-full max-w-md justify-between mx-auto"
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
                          placeholder="Description"
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
                            className="bg-black text-white px-4 py-2 rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
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
                      transition={{ duration: 0.1, ease: "easeOut"}}
                      className="flex flex-col gap-12 w-full max-w-md justify-center mx-auto"
                    >
                      <h2 className="text-2xl text-center font-medium">{steps[step - 1].title}</h2>
                      <section className="flex flex-col gap-4">
                        <input name="title" placeholder="Search users" className="bg-bg-secondary w-full rounded-md p-2"/>
                        <button
                            type="submit"
                            disabled={!isStep1Valid}
                            className="bg-black text-white p-2 rounded-md disabled:opacity-40 disabled:cursor-not-allowed mt-12"
                          >
                            Submit
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
                </AnimatePresence>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}