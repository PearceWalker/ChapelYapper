import Head from 'next/head';



export default function BugReport() {
  return (
    <div className="min-h-screen bg-[var(--sidebar-color)] flex flex-col items-center justify-center p-6 text-white">
      <Head>
        <title>Report a Bug | ChapYapper</title>
      </Head>
      <a
  href="/rooms"
  className="text-sm text-white-600 hover:text-gray-500 mb-4 flex items-center"
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-4 w-4 mr-2"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
  Back to rooms
</a>

      <h1 className="text-3xl font-bold mb-4">🐞 Report a Bug</h1>
      <form
        action="https://api.web3forms.com/submit"
        method="POST"
        className="w-full max-w-md bg-white text-black p-6 rounded shadow-md"
      >
        <input type="hidden" name="access_key" value="8527a796-b899-4dd9-905d-6976201071e3" />
        <input type="hidden" name="subject" value="ChapYapper Bug Report" />

        <label className="block mb-2 font-medium">Your Email</label>
        <input type="email" name="email" required className="w-full p-2 mb-4 border rounded" />

        <label className="block mb-2 font-medium">Describe the Bug</label>
        <textarea name="message" required rows="5" className="w-full p-2 mb-4 border rounded" />

        <button
          type="submit"
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded w-full"
        >
          Submit Bug Report
        </button>
      </form>
    </div>
  );
}
