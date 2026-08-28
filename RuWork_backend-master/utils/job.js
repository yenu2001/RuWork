export const JOB_CATEGORIES = [
    "Delivery",
    "Buy and Sell",
    "Tutoring",
    "Event Support",
    "Data Entry",
    "Content Creation",
    "Other"
];

export const JOB_BUDGET_TYPES = ["hourly", "fixed"];
export const JOB_STATUSES = ["draft", "open", "closed"];
export const JOB_SUITABLE_YEARS = [
    "Any Year",
    "1st Year",
    "2nd Year",
    "3rd Year",
    "4th Year",
    "Final Year"
];

export function normalizeSkills(values) {
    if (!Array.isArray(values)) return values;

    const seen = new Set();
    return values.reduce((skills, value) => {
        if (typeof value !== "string") return skills;
        const skill = value.trim().replace(/\s+/g, " ");
        const key = skill.toLowerCase();
        if (!skill || seen.has(key)) return skills;
        seen.add(key);
        skills.push(skill);
        return skills;
    }, []);
}

export function escapeSearchText(value) {
    return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

export function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
