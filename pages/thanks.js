export default function Thanks() {
  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-b from-white to-blue-50 text-gray-800 px-6">
      <div className="max-w-xl bg-white border rounded-2xl p-8 shadow-sm text-center">
        <h1 className="text-3xl font-extrabold text-blue-800 mb-2">Thanks for reaching out!</h1>
        <p className="text-gray-600">Your request has been received. We’ll get in touch from <b>info@dentflowai.co.za</b> soon.</p>
        <a href="/" className="inline-block mt-6 px-4 py-2 rounded-xl bg-blue-700 text-white hover:bg-blue-800">Back to Home</a>
      </div>
    </div>
  )
}
