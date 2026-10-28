/* Crio News Feed Website
File: resources/js/index.js
*/

document.addEventListener("DOMContentLoaded", () => {
    const newsAccordion = document.getElementById("news-accordion");

    const topics = ["Politics", "India Tech", "Sports"];

    if (!newsAccordion) {
        console.error('Element with id "news-accordion" was not found.');
        return;
    }

    if (typeof magazines === "undefined" ||
        !Array.isArray(magazines) ||
        magazines.length === 0) {
        newsAccordion.textContent = "News feed configuration could not be loaded.";
        console.error("RSS feed configuration is missing.");
        return;
    }

    // Create the Bootstrap accordion for each RSS topic.
    function createAccordion(topic, index) {
        const item = document.createElement("div");
        item.className = "accordion-item";

        const headingId = `heading-${index}`;
        const collapseId = `collapse-${index}`;

        item.innerHTML = `
            <h2 class="accordion-header" id="${headingId}">
                <button
                    class="accordion-button ${index === 0 ? "" : "collapsed"}"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#${collapseId}"
                    aria-expanded="${index === 0 ? "true" : "false"}"
                    aria-controls="${collapseId}">
                    ${topic}
                </button>
            </h2>

            <div
                id="${collapseId}"
                class="accordion-collapse collapse ${index === 0 ? "show" : ""}"
                aria-labelledby="${headingId}"
                data-bs-parent="#news-accordion">
                <div class="accordion-body">
                    <div id="news-content-${index}">
                        <p class="text-muted">Loading news...</p>
                    </div>
                </div>
            </div>
        `;

        newsAccordion.appendChild(item);
    }

    // Safely escape text before inserting it into HTML.
    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]);
    }

    // Remove HTML tags from RSS text (descriptions often contain markup).
    function stripHTML(value) {
        return String(value ?? "").replace(/<[^>]*>/g, "").trim();
    }

    // Get a usable image URL from an RSS article.
    function getImage(article) {
        const image =
            article.thumbnail ||
            article.enclosure?.link ||
            article.enclosure?.url ||
            "";

        try {
            const parsed = new URL(image);
            if (parsed.protocol === "https:" ||
                parsed.protocol === "http:") {
                return parsed.href;
            }
        } catch (error) {
            // Use the fallback (no image) if the URL is invalid.
        }

        return "";
    }

    // Create a Bootstrap carousel containing the news articles.
    function createCarousel(items, index) {
        const carouselId = `news-carousel-${index}`;

        if (!items || items.length === 0) {
            return '<p class="text-muted">No news articles available.</p>';
        }

        const slides = items.map((article, articleIndex) => {
            const title = escapeHTML(article.title || "Untitled article");
            const description = escapeHTML(
                stripHTML(
                    article.description ||
                    article.content ||
                    "No description available."
                )
            );

            const image = getImage(article);
            const articleURL = (() => {
                try {
                    const parsed = new URL(article.link || "");
                    return ["https:", "http:"].includes(parsed.protocol)
                        ? parsed.href
                        : "";
                } catch (error) {
                    return "";
                }
            })();

            const imageHTML = image
                ? `<img
                    src="${escapeHTML(image)}"
                    class="card-img-top"
                    alt="${title}"
                    style="height:220px; object-fit:cover;"
                    onerror="this.style.display='none'">`
                : "";

            const cardHTML = `
                <div class="card h-100">
                    ${imageHTML}
                    <div class="card-body">
                        <h5 class="card-title">${title}</h5>
                        <p class="card-text">${description}</p>
                    </div>
                </div>
            `;

            const content = articleURL
                ? `<a href="${escapeHTML(articleURL)}"
                       target="_blank"
                       rel="noopener noreferrer"
                       class="text-decoration-none text-dark">
                       ${cardHTML}
                   </a>`
                : cardHTML;

            return `
                <div class="carousel-item ${articleIndex === 0 ? "active" : ""}">
                    ${content}
                </div>
            `;
        }).join("");

        return `
            <div id="${carouselId}"
                 class="carousel slide"
                 data-bs-interval="false">

                <div class="carousel-inner">
                    ${slides}
                </div>

                <button
                    class="carousel-control-prev"
                    type="button"
                    data-bs-target="#${carouselId}"
                    data-bs-slide="prev"
                    aria-label="Previous article">
                    <span class="carousel-control-prev-icon"
                          aria-hidden="true"
                          style="background-color:#333;"></span>
                </button>

                <button
                    class="carousel-control-next"
                    type="button"
                    data-bs-target="#${carouselId}"
                    data-bs-slide="next"
                    aria-label="Next article">
                    <span class="carousel-control-next-icon"
                          aria-hidden="true"
                          style="background-color:#333;"></span>
                </button>
            </div>
        `;
    }

    // Fallback: get the raw RSS XML from several sources (direct, then CORS
    // proxies), stop at the first that works, and convert it to the same
    // shape that rss2json returns.
    async function fetchViaProxy(rssUrl) {
        const proxyUrl =
          "https://api.allorigins.win/raw?url=" + encodeURIComponent(rssUrl);
      
        const response = await fetch(proxyUrl);
        if (!response.ok) {
          throw new Error(`Proxy HTTP error: ${response.status}`);
        }
      
        const text = await response.text();
        const xml = new DOMParser().parseFromString(text, "text/xml");
        if (xml.querySelector("parsererror")) {
          throw new Error("Invalid RSS XML");
        }
      
        const getText = (item, tag) =>
          item.getElementsByTagName(tag)[0]?.textContent?.trim() || "";
      
        const items = [...xml.getElementsByTagName("item")].map((item) => {
          const enclosure = item.getElementsByTagName("enclosure")[0];
          const media =
            item.getElementsByTagName("media:content")[0] ||
            item.getElementsByTagName("media:thumbnail")[0];
      
          return {
            title: getText(item, "title"),
            pubDate: getText(item, "pubDate"),
            link: getText(item, "link"),
            guid: getText(item, "guid"),
            author: getText(item, "author") || getText(item, "dc:creator"),
            thumbnail: media?.getAttribute("url") || enclosure?.getAttribute("url") || "",
            description: getText(item, "description"),
            content: getText(item, "content:encoded"),
            enclosure: { link: enclosure?.getAttribute("url") || "" },
            categories: [...item.getElementsByTagName("category")].map((c) => c.textContent),
          };
        });
      
        return {
          status: "ok",
          feed: {
            title: getText(xml, "title"),
            link: getText(xml, "link"),
          },
          items,
        };
      }

    // Try rss2json first; if it fails (403, CORS, etc.), use the fallback.
    async function fetchFeed(rssUrl) {
        try {
            const apiUrl =
                "https://api.rss2json.com/v1/api.json?rss_url=" +
                encodeURIComponent(rssUrl);

            const response = await fetch(apiUrl);

            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }

            const data = await response.json();

            if (data.status !== "ok") {
                throw new Error(data.message || "RSS feed request failed.");
            }

            return data;
        } catch (error) {
            console.warn("rss2json failed, using fallback:", error);
            return fetchViaProxy(rssUrl);
        }
    }

    // Fetch RSS data and render the news carousel.
    async function loadNews(rssUrl, index) {
        const container = document.getElementById(`news-content-${index}`);

        if (!container) return;

        try {
            const data = await fetchFeed(rssUrl);

            container.innerHTML = createCarousel(
                data.items || [],
                index
            );

            // Verify that Bootstrap's carousel JavaScript is available.
            const carouselElement = document.getElementById(
                `news-carousel-${index}`
            );

            if (carouselElement && window.bootstrap?.Carousel) {
                window.bootstrap.Carousel.getOrCreateInstance(
                    carouselElement,
                    {
                        interval: false,
                        ride: false,
                        wrap: true
                    }
                );
            }
        } catch (error) {
            console.error(`Error loading topic ${index + 1}:`, error);

            container.innerHTML = `
                <p class="text-danger">
                    Unable to load news. Please try again later.
                </p>
            `;
        }
    }

    // Initialize the application.
    // Step 1: create all accordion items first.
    magazines.forEach((rssUrl, index) => {
        createAccordion(topics[index] || `Topic ${index + 1}`, index);
    });

    // Step 2: load the feeds one at a time to avoid rate limiting.
    (async () => {
        for (let index = 0; index < magazines.length; index++) {
            await loadNews(magazines[index], index);
        }
    })();
});
