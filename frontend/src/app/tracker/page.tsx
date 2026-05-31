import { TrackerExperience } from "@/components/tracker-experience";

export default function TrackerPage() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    const localApplications = loadLocalApplications();
    setApplications(localApplications);

    try {
      const response = await fetchWithTimeout("/api/tracker/applications");
      if (response.ok) {
        const data = await response.json();
        setApplications(data);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } else {
        setError("Backend is unavailable. Using browser storage for this demo.");
      }
    } catch {
      setError("Backend is unavailable. Using browser storage for this demo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="pb-12">
      {/* Page Header */}
      <div className="mb-6 border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-extrabold text-[#111827]">Tracker</h1>
        <p className="mt-1 text-sm font-medium text-[#6B7280]">
          Monitor application status, follow-up timing, interview stages, and outcomes.
        </p>
      </div>
      <TrackerExperience />
    </div>
  );
}
