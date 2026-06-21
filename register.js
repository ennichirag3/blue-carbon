const API_URL = "https://blue-carbon-f3kd.onrender.com/api/projects";

// Load projects + update stats dynamically
async function loadProjects() {
    try {
        const res = await fetch(API_URL);
        let data = await res.json();

        // ✅ If API returns { projects: [...] } unwrap it
        const projects = Array.isArray(data) ? data : data.projects || [];

        const list = document.getElementById("projectsList");
        list.innerHTML = "";

        if (projects.length === 0) {
            list.innerHTML = `<p style="color:#555; text-align:center;">No projects found. Add one above ⬆️</p>`;
            document.getElementById("projectCount").textContent = "0";
            document.getElementById("carbonTotal").textContent = "0";
            return;
        }

        // ✅ Calculate stats even if carbonSaved is string/undefined
        const totalCarbon = projects.reduce((sum, p) => {
            const carbon = Number(p.carbonSaved) || 0;
            return sum + carbon;
        }, 0);

        document.getElementById("projectCount").textContent = projects.length;
        document.getElementById("carbonTotal").textContent = totalCarbon;

        // ✅ Render projects
        projects.forEach(p => {
            const div = document.createElement("div");
            div.className = "project-card";
            div.innerHTML = `
                <h3>${p.name || "Unnamed Project"}</h3>
                <p>${p.description || "No description provided"}</p>
                <p><strong>📍 Location:</strong> ${p.location || "Unknown"}</p>
                <p><strong>🌱 Carbon Saved:</strong> ${Number(p.carbonSaved) || 0} tons</p>
                <button class="delete-btn" onclick="deleteProject('${p._id}')">🗑 Delete</button>
            `;
            list.appendChild(div);
        });

    } catch (err) {
        console.error("❌ Error loading projects:", err);
        document.getElementById("projectsList").innerHTML =
            `<p style="color:red; text-align:center;">⚠️ Failed to load projects</p>`;
        document.getElementById("projectCount").textContent = "0";
        document.getElementById("carbonTotal").textContent = "0";
    }
}

// Handle new project submission
document.getElementById("projectForm").addEventListener("submit", async e => {
    e.preventDefault();

    const project = {
        name: document.getElementById("name").value.trim(),
        description: document.getElementById("description").value.trim(),
        location: document.getElementById("location").value.trim(),
        carbonSaved: Number(document.getElementById("carbonSaved").value)
    };

    if (!project.name || !project.description || !project.location || isNaN(project.carbonSaved)) {
        alert("⚠️ Please fill out all fields correctly.");
        return;
    }

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(project)
        });

        const data = await res.json();

        if (res.ok) {
            alert("✅ Project added successfully!");
            e.target.reset();
            loadProjects(); // reload list + stats
        } else {
            alert(`❌ Failed to add project: ${data.message || "Unknown error"}`);
        }
    } catch (err) {
        console.error("❌ Error adding project:", err);
        alert("⚠️ Network error while adding project.");
    }
});

// Delete project
async function deleteProject(id) {
    if (!confirm("🗑 Are you sure you want to delete this project?")) return;

    try {
        const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
        const data = await res.json();

        if (res.ok) {
            alert("🗑 Project deleted successfully!");
            loadProjects();
        } else {
            alert(`❌ Failed to delete project: ${data.message || "Unknown error"}`);
        }
    } catch (err) {
        console.error("❌ Error deleting project:", err);
        alert("⚠️ Network error while deleting project.");
    }
}

// Initial load
loadProjects();
