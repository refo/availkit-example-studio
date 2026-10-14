import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  createClient,
  type AvailabilitySlot,
  type Booking,
} from "@availkit/client";
import { parseCatalog, type StudioStaff, type StudioService } from "./catalog";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-700.css";
import "@fontsource/newsreader/latin-400.css";
import { browserConfig } from "./config";
import {
  bookingFailure,
  errorMessage,
  makeAttempt,
  submitAttempt,
  type BookingAttempt,
} from "./booking";
import "./style.css";

function tomorrow() {
  return new Date(Date.now() + 86400000).toISOString().slice(0, 10);
}
const time = (date: string) =>
  new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(date));
const day = (date: string) =>
  new Intl.DateTimeFormat("en", { dateStyle: "full", timeZone: "UTC" }).format(
    new Date(date),
  );
const money = (service: StudioService) =>
  new Intl.NumberFormat("en", {
    style: "currency",
    currency: service.currency,
  }).format(Number(service.price));

function App() {
  const [setup] = useState(() => {
    try {
      return {
        client: createClient(
          browserConfig(
            import.meta.env.VITE_AVAILKIT_BASE_URL,
            import.meta.env.VITE_AVAILKIT_PUBLISHABLE_KEY,
          ),
        ),
        error: "",
      };
    } catch (error) {
      return {
        client: null,
        error:
          error instanceof Error
            ? error.message
            : "Check the browser configuration.",
      };
    }
  });
  const client = setup.client;
  const [services, setServices] = useState<StudioService[]>([]);
  const [staff, setStaff] = useState<StudioStaff[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState(tomorrow);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selected, setSelected] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [sending, setSending] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [message, setMessage] = useState("");
  const [reload, setReload] = useState(0);
  const [catalogReload, setCatalogReload] = useState(0);
  const [booking, setBooking] = useState<Booking | null>(null);
  const attempt = useRef<BookingAttempt | null>(null);
  const submitLock = useRef(false);
  const confirmation = useRef<HTMLHeadingElement>(null);
  const service = services.find((item) => item.id === serviceId);
  const availableStaff = staff;
  const locked = sending || uncertain || Boolean(booking);

  useEffect(() => {
    if (!client) return;
    let current = true;
    setLoadingCatalog(true);
    setMessage("");
    fetch("/studio.json", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok || !response.headers.get("Content-Type")?.includes("application/json"))
          throw new Error(
            "Import and configure the studio catalog, then reload.",
          );
        return parseCatalog(await response.json());
      })
      .then((catalog) => {
        if (!current) return;
        setServices(catalog.services);
        setStaff(catalog.staff);
      })
      .catch((error) => {
        if (current)
          setMessage(
            error instanceof Error
              ? error.message
              : "Configure the studio catalog, then reload.",
          );
      })
      .finally(() => {
        if (current) setLoadingCatalog(false);
      });
    return () => {
      current = false;
    };
  }, [client, catalogReload]);

  useEffect(() => {
    setSelected("");
    setSlots([]);
    if (!client || !serviceId || !staffId || !date) {
      setLoadingSlots(false);
      return;
    }
    let current = true;
    const abort = new AbortController();
    setLoadingSlots(true);
    client
      .getAvailability(
        { service_id: serviceId, resource_id: staffId, date },
        { signal: abort.signal },
      )
      .then((response) => {
        if (!current) return;
        if (response.status !== 200)
          throw new Error("Availability request failed");
        setSlots(response.data.slots);
      })
      .catch((error) => {
        if (current) setMessage(errorMessage(error));
      })
      .finally(() => {
        if (current) setLoadingSlots(false);
      });
    return () => {
      current = false;
      abort.abort();
    };
  }, [client, serviceId, staffId, date, reload]);

  useEffect(() => {
    if (booking) confirmation.current?.focus();
  }, [booking]);

  async function book(event: React.FormEvent) {
    event.preventDefault();
    if (
      !client ||
      submitLock.current ||
      booking ||
      !serviceId ||
      !staffId ||
      !selected
    )
      return;
    if (!attempt.current && (!name.trim() || !email.trim())) {
      setMessage("Enter your name and email before requesting an appointment.");
      return;
    }
    submitLock.current = true;
    setSending(true);
    setMessage("");
    attempt.current ??= makeAttempt(serviceId, staffId, selected, name, email);
    try {
      setBooking(await submitAttempt(client, attempt.current));
      setUncertain(false);
      attempt.current = null;
    } catch (error) {
      const kind = bookingFailure(error);
      if (kind === "stale") {
        attempt.current = null;
        setUncertain(false);
        setSelected("");
        setReload((value) => value + 1);
        setMessage(
          "That time was just booked. Choose another available time; your details are still here.",
        );
      } else if (kind === "uncertain") {
        setUncertain(true);
        setMessage(
          "We could not confirm the result. Keep this tab open and retry the same request to avoid a duplicate booking.",
        );
      } else {
        if (uncertain) {
          setMessage(
            `${errorMessage(error)} The original booking result is still uncertain. Ask the operator to inspect it before starting a new request.`,
          );
        } else {
          attempt.current = null;
          setUncertain(false);
          setMessage(errorMessage(error));
        }
      }
    } finally {
      submitLock.current = false;
      setSending(false);
    }
  }

  return (
    <main>
      <header>
        <a className="wordmark" href="/">
          Appointment
          <br />
          Studio<span aria-hidden="true">.</span>
        </a>
        <span className="test-note">Test studio · No payment collected</span>
      </header>
      <div className="layout">
        <aside>
          <h1>
            Make time
            <br />
            for a visit.
          </h1>
          <p>
            Choose your service, find a time, and send your appointment request.
          </p>
          <dl>
            <dt>Location</dt>
            <dd>Appointment Studio</dd>
            <dt>Hours</dt>
            <dd>Every day, 9 am–5 pm</dd>
            <dt>Timezone</dt>
            <dd>UTC · All times shown</dd>
          </dl>
          <p className="aside-note">
            An AvailKit developer example.
            <br />
            Use test contact details.
          </p>
        </aside>
        <section className="booking-panel" aria-label="Book an appointment">
          {setup.error ? (
            <div role="alert">
              <h2>Connect your test workspace</h2>
              <p>{setup.error}</p>
              <p>
                See the repository’s setup guide for catalog import and
                configuration.
              </p>
            </div>
          ) : booking ? (
            <div className="confirmation">
              <h2 ref={confirmation} tabIndex={-1}>
                Your request is received.
              </h2>
              <p>
                {name}, your appointment is pending. The studio operator can
                confirm it.
              </p>
              <dl>
                <dt>Service</dt>
                <dd>{service?.name}</dd>
                <dt>With</dt>
                <dd>{staff.find((item) => item.id === staffId)?.name}</dd>
                <dt>When</dt>
                <dd>
                  {day(booking.startsAt)}
                  <br />
                  {time(booking.startsAt)} UTC
                </dd>
                <dt>Booking reference</dt>
                <dd className="reference">{booking.id}</dd>
                <dt>Status</dt>
                <dd>{booking.status}</dd>
              </dl>
              <p>
                No confirmation email is sent by this example. Save your
                reference for the operator.
              </p>
              <button
                onClick={() => {
                  setBooking(null);
                  setSelected("");
                  setName("");
                  setEmail("");
                  setReload((value) => value + 1);
                }}
              >
                Book another visit
              </button>
            </div>
          ) : (
            <form onSubmit={book}>
              <h2>Book a visit</h2>
              <p className="intro">Start with the service that fits.</p>
              {loadingCatalog ? (
                <p role="status">Loading the studio…</p>
              ) : (
                <>
                  <fieldset disabled={locked}>
                    <legend>Choose a service</legend>
                    <div className="service-list">
                      {services.map((item) => (
                        <label
                          className={`service-option ${serviceId === item.id ? "chosen" : ""}`}
                          key={item.id}
                        >
                          <input
                            type="radio"
                            name="service"
                            value={item.id}
                            checked={serviceId === item.id}
                            onChange={() => {
                              setServiceId(item.id);
                              setStaffId("");
                              setMessage("");
                            }}
                          />
                          <span>
                            <strong>{item.name}</strong>
                            <small>{item.durationMinutes} minutes</small>
                          </span>
                          <span className="price">{money(item)}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  {services.length === 0 && (
                    <button
                      type="button"
                      onClick={() => setCatalogReload((value) => value + 1)}
                    >
                      Reload studio
                    </button>
                  )}
                  <fieldset disabled={locked || !serviceId}>
                    <legend>Choose your staff and date</legend>
                    <div className="two-columns">
                      <label>
                        Staff
                        <select
                          aria-label="Staff"
                          required
                          value={staffId}
                          onChange={(event) => {
                            setStaffId(event.target.value);
                            setMessage("");
                          }}
                        >
                          <option value="">Select staff</option>
                          {availableStaff.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Date
                        <input
                          aria-describedby="timezone"
                          required
                          type="date"
                          min={new Date().toISOString().slice(0, 10)}
                          value={date}
                          onChange={(event) => {
                            setDate(event.target.value);
                            setMessage("");
                          }}
                        />
                      </label>
                    </div>
                    <p id="timezone" className="hint">
                      Dates and times are in UTC.
                    </p>
                  </fieldset>
                  <fieldset disabled={locked || loadingSlots || !staffId}>
                    <legend>Choose an available time</legend>
                    {loadingSlots ? (
                      <p role="status">Finding available times…</p>
                    ) : !staffId ? (
                      <p className="hint">
                        Select a service and staff to see available times.
                      </p>
                    ) : slots.length === 0 ? (
                      <p className="hint">
                        No times are available. Try another date or staff
                        member.
                      </p>
                    ) : (
                      <div className="slots">
                        {slots.map((slot) => (
                          <label
                            className={
                              selected === slot.starts_at ? "chosen" : ""
                            }
                            key={slot.starts_at}
                          >
                            <input
                              required
                              type="radio"
                              name="slot"
                              checked={selected === slot.starts_at}
                              onChange={() => {
                                setSelected(slot.starts_at);
                                setMessage("");
                              }}
                            />
                            <span>{time(slot.starts_at)}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </fieldset>
                  {staffId && !locked && (
                    <button
                      type="button"
                      className="text-button"
                      disabled={loadingSlots}
                      onClick={() => {
                        setMessage("");
                        setReload((value) => value + 1);
                      }}
                    >
                      Refresh available times
                    </button>
                  )}
                  <fieldset disabled={locked || !selected}>
                    <legend>Your contact details</legend>
                    <div className="two-columns">
                      <label>
                        Name
                        <input
                          required
                          name="name"
                          autoComplete="name"
                          maxLength={100}
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                        />
                      </label>
                      <label>
                        Email
                        <input
                          required
                          name="email"
                          type="email"
                          autoComplete="email"
                          maxLength={254}
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                        />
                      </label>
                    </div>
                  </fieldset>
                </>
              )}
              {message && (
                <p role="alert" className="notice">
                  {message}
                </p>
              )}
              {uncertain && (
                <p className="hint">
                  Retry reference: <code>{attempt.current?.key}</code>. If
                  retries keep failing, ask the operator to inspect bookings
                  before starting again.
                </p>
              )}
              <button
                className="submit"
                type="submit"
                disabled={
                  sending || !selected || loadingSlots || loadingCatalog
                }
              >
                {sending
                  ? "Sending your request…"
                  : uncertain
                    ? "Retry the same request"
                    : "Request appointment"}
              </button>
              <p className="hint">
                Requests are pending until the operator confirms them.
              </p>
            </form>
          )}
        </section>
      </div>
      <footer>
        <span>Built with AvailKit</span>
        <a href="https://availkit.com">About AvailKit</a>
      </footer>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
