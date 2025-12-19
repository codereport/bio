// Simple data object to avoid fetch/CORS issues for local file opening
const EMBEDDED_DATA = `
# Timeline

## Career
- Moody's Analytics | Actuarial Programmer | 2014-05 | 2018-07| assets/moodys.png
- Amazon | Software Development Engineer | 2018-08 | 2019-09 | assets/amazon.png
- NVIDIA | Senior Software Engineer | 2019-10 | 2022-06 | assets/nvidia.png
- NVIDIA | Research Scientist | 2022-07 | Present | assets/nvidia.png

## Content
- YouTube | 2017-07 | Present | fa-youtube
- Twitter | 2018-01 | Present | fa-x-twitter
- ADSP Podcast | 2021-01 | Present | assets/adsp_logo.png
- ArrayCast | 2022-01 | Present | assets/arraycast_logo.webp
- Tacit Talk | 2024-01 | Present | assets/tacit_talk_logo.png

## Languages
- C++ | 2014-05 | Present | assets/cpp.png
- Python | 2020-07 | Present | fa-python
- APL | 2019-11 | Present | assets/apl.png
- BQN | 2020-06 | Present | assets/bqn.png
`;

document.addEventListener('DOMContentLoaded', () => {
    // Try to fetch first, fall back to embedded data if it fails (likely CORS)
    fetch('timeline.md')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.text();
        })
        .then(markdown => {
            if (!markdown) throw new Error('Empty markdown');
            const data = parseMarkdown(markdown);
            renderTimeline(data);
        })
        .catch(err => {
            console.log('Fetch failed (likely CORS or empty file), using embedded data:', err);
            // Fallback to embedded data
            const data = parseMarkdown(EMBEDDED_DATA);
            renderTimeline(data);
        });
});

function parseMarkdown(markdown) {
    if (!markdown) return [];
    
    const lines = markdown.split('\n');
    const sections = [];
    let currentSection = null;

    lines.forEach(line => {
        line = line.trim();
        if (line.startsWith('## ')) {
            currentSection = {
                title: line.replace('## ', '').trim(),
                items: []
            };
            sections.push(currentSection);
        } else if (line.startsWith('- ') && currentSection) {
            // Format 1: - Label | Start | End | Icon
            // Format 2: - Label | Title | Start | End | Icon
            const content = line.replace('- ', '');
            const parts = content.split('|').map(s => s.trim());
            
            if (parts.length === 4) {
                 // Old format
                currentSection.items.push({
                    label: parts[0],
                    title: null,
                    start: parseDate(parts[1]),
                    end: parseDate(parts[2]),
                    icon: parts[3] || null
                });
            } else if (parts.length >= 5) {
                // New format with Title
                currentSection.items.push({
                    label: parts[0],
                    title: parts[1],
                    start: parseDate(parts[2]),
                    end: parseDate(parts[3]),
                    icon: parts[4] || null
                });
            }
        }
    });

    return sections;
}

function parseDate(dateStr) {
    if (!dateStr || dateStr.toLowerCase() === 'present') {
        return new Date();
    }
    // Assume YYYY-MM
    const [year, month] = dateStr.split('-').map(Number);
    return new Date(year, (month || 1) - 1);
}

function renderTimeline(sections) {
    const container = document.getElementById('timeline-visualization');
    container.innerHTML = '';

    if (sections.length === 0) return;

    // Calculate global bounds: Fixed 2014 to 2026
    const minDate = new Date(2014, 0, 1);
    const maxDate = new Date(2026, 0, 1);
    const totalDuration = maxDate - minDate;

    // Helper to merge consecutive same-label items (for NVIDIA)
    const mergeItems = (items) => {
        // Sort items by start date first just in case
        const sorted = [...items].sort((a, b) => a.start - b.start);
        const merged = [];
        let current = null;

        sorted.forEach(item => {
            // Check if label matches and there is no significant gap (e.g. < 30 days)
            // Or if they essentially overlap/abut
            if (current && item.label === current.label) {
                // Determine if contiguous
                // The gap between current.end and item.start
                const gap = item.start - current.end;
                const isContiguous = gap <= (1000 * 60 * 60 * 24 * 30); // 30 days

                if (isContiguous) {
                     // Extend current
                    current.end = item.end;
                    // Add to sub-items
                    current.subItems.push(item);
                    return;
                }
            }
            
            // If we get here, either no current or not contiguous
            if (current) merged.push(current);
            // Create new
            current = { ...item, subItems: [item] };
        });
        if (current) merged.push(current);
        return merged;
    };


    // Separate sections
    const contentSection = sections.find(s => s.title.toLowerCase() === 'content');
    const otherSections = sections.filter(s => s.title.toLowerCase() !== 'content');

    // 1. Render Content Icons (on top of Axis)
    if (contentSection) {
        const contentContainer = document.createElement('div');
        contentContainer.className = 'content-icon-row';
        contentContainer.style.position = 'relative';
        contentContainer.style.height = '60px'; // Space for icons
        contentContainer.style.marginBottom = '-20px'; // Overlap with axis a bit or sit right on top

        contentSection.items.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'timeline-item content-icon-item';
            
            const startPos = ((item.start - minDate) / totalDuration) * 100;
            
            // If startPos < 0, it won't show correctly, but we assume data fits in 2014-2026
            
            itemEl.style.left = `${startPos}%`;
            itemEl.style.position = 'absolute';
            // Determine type for styling
            const isSocial = item.icon && item.icon.startsWith('fa-');
            if (isSocial) {
                itemEl.classList.add('type-social');
                itemEl.style.bottom = '35px'; // Move social icons up slightly higher
            } else {
                itemEl.classList.add('type-media'); // Podcasts/Images
                itemEl.style.bottom = '25px';
            }
            
            // Icon
            if (item.icon) {
                const iconContainer = document.createElement('div');
                iconContainer.className = 'item-icon';
                if (item.icon.startsWith('fa-')) {
                    const prefix = (item.icon.includes('code') || item.icon.includes('terminal') || item.icon.includes('solid')) ? 'fas' : 'fa-brands';
                    iconContainer.innerHTML = `<i class="${prefix} ${item.icon}"></i>`;
                } else {
                    const img = document.createElement('img');
                    img.src = item.icon;
                    img.alt = item.label;
                    img.onerror = () => { img.style.display = 'none'; iconContainer.innerHTML = '<i class="fas fa-circle"></i>'; }; 
                    iconContainer.appendChild(img);
                }
                itemEl.appendChild(iconContainer);
            }
            
            // Tooltip
            itemEl.title = `${item.label} (${item.start.getFullYear()})`;
            contentContainer.appendChild(itemEl);
        });
        
        container.appendChild(contentContainer);
    }

    // 2. Create Axis
    const axis = document.createElement('div');
    axis.className = 'timeline-axis';
    
    // Adjust container to have padding for labels
    container.style.paddingLeft = '30px';
    container.style.paddingRight = '30px';
    
    for (let year = minDate.getFullYear(); year <= maxDate.getFullYear(); year++) {
        const tickDate = new Date(year, 0);
        const position = ((tickDate - minDate) / totalDuration) * 100;
        
        if (position >= 0 && position <= 100) {
            const tick = document.createElement('div');
            tick.className = 'axis-tick';
            tick.style.left = `${position}%`;
            tick.innerHTML = `<span class="tick-label">${year}</span>`;
            axis.appendChild(tick);
        }
    }
    container.appendChild(axis);

    // 3. Render Other Sections
    otherSections.forEach(section => {
        const sectionEl = document.createElement('div');
        sectionEl.className = 'timeline-section';
        const sectionSlug = section.title.toLowerCase().replace(/\s+/g, '-');
        sectionEl.classList.add(`section-${sectionSlug}`);
        
        const title = document.createElement('h3');
        title.className = 'section-title';
        title.textContent = section.title;
        sectionEl.appendChild(title);

        const trackContainer = document.createElement('div');
        trackContainer.className = 'track-container';

        const rows = []; 
        let rowHeight = 50;
        let itemHeight = 40;
        
        if (sectionSlug === 'career') {
            rowHeight = 100;
            itemHeight = 80;
            // Merge items only for Career section
            section.items = mergeItems(section.items);
        }

        section.items.forEach(item => {
            let rowIndex = 0;
            while (true) {
                const row = rows[rowIndex];
                if (!row) {
                    rows[rowIndex] = [];
                    break;
                }
                const hasCollision = row.some(existing => {
                    return (item.start < existing.end && item.end > existing.start);
                });
                
                if (!hasCollision) {
                    break;
                }
                rowIndex++;
            }
            
            rows[rowIndex].push(item);
            item.rowIndex = rowIndex;
        });

        trackContainer.style.height = `${(rows.length) * rowHeight + 20}px`;

        section.items.forEach(item => {
            // Check if this is a merged item
            const isMerged = item.subItems && item.subItems.length > 1;

            if (isMerged) {
                // Render Merged Item (Segments)
                // We will render separate divs for each sub-item but connected visually
                item.subItems.forEach((subItem, index) => {
                    const itemEl = document.createElement('div');
                    itemEl.className = 'timeline-item merged-item';
                    
                    // Add classes for styling corners
                    if (index === 0) itemEl.classList.add('merge-start');
                    if (index === item.subItems.length - 1) itemEl.classList.add('merge-end');
                    if (index > 0 && index < item.subItems.length - 1) itemEl.classList.add('merge-middle');

                    const subStartPos = ((subItem.start - minDate) / totalDuration) * 100;
                    const subEndPos = ((subItem.end - minDate) / totalDuration) * 100;
                    const subWidth = Math.max(subEndPos - subStartPos, 0.5);

                    itemEl.style.left = `${subStartPos}%`;
                    itemEl.style.width = `${subWidth}%`;
                    itemEl.style.top = `${item.rowIndex * rowHeight}px`;
                    itemEl.style.height = `${itemHeight}px`;

                    // Icon: Only for first segment
                    if (index === 0 && subItem.icon) {
                        const iconContainer = document.createElement('div');
                        iconContainer.className = 'item-icon';
                        const img = document.createElement('img');
                        img.src = subItem.icon;
                        img.alt = subItem.label;
                        img.onerror = () => { img.style.display = 'none'; }; 
                        iconContainer.appendChild(img);
                        itemEl.appendChild(iconContainer);
                    }

                    // Label: Only for first segment, or maybe simplified?
                    // User wants "include both titles".
                    // So we put title in each segment.
                    // But maybe only one Main Label "NVIDIA" in first segment?
                    
                    const labelContainer = document.createElement('div');
                    labelContainer.className = 'label-container';
                    labelContainer.style.display = 'flex';
                    labelContainer.style.flexDirection = 'column';
                    labelContainer.style.justifyContent = 'center';

                    const label = document.createElement('span');
                    label.className = 'item-label';
                    label.textContent = subItem.label; // "NVIDIA"
                    // If not first segment, maybe hide "NVIDIA" label or make it smaller?
                    if (index > 0) {
                        label.style.display = 'none'; // Hide company name on subsequent segments
                    }
                    labelContainer.appendChild(label);

                    if (subItem.title) {
                        const subLabel = document.createElement('span');
                        subLabel.className = 'item-sublabel';
                        subLabel.textContent = subItem.title;
                        labelContainer.appendChild(subLabel);
                    }
                    
                    itemEl.appendChild(labelContainer);
                    
                    // Tooltip
                    let tooltipText = `${subItem.label} - ${subItem.title} (${subItem.start.getFullYear()} - ${subItem.end.getFullYear() === new Date().getFullYear() && subItem.end.getMonth() === new Date().getMonth() ? 'Present' : subItem.end.getFullYear()})`;
                    itemEl.title = tooltipText;

                    trackContainer.appendChild(itemEl);
                });
            } else {
                // Normal Item Rendering
                const itemEl = document.createElement('div');
                itemEl.className = 'timeline-item';
                
                // Amazon Fix: Check duration
                const durationMonths = (item.end - item.start) / (1000 * 60 * 60 * 24 * 30.44);
                if (durationMonths < 18) { // Less than 1.5 years
                    itemEl.classList.add('short-item');
                }

                const startPos = ((item.start - minDate) / totalDuration) * 100;
                const endPos = ((item.end - minDate) / totalDuration) * 100;
                const width = Math.max(endPos - startPos, 0.5); 

                itemEl.style.left = `${startPos}%`;
                itemEl.style.width = `${width}%`;
                itemEl.style.top = `${item.rowIndex * rowHeight}px`;
                itemEl.style.height = `${itemHeight}px`;

                if (item.icon) {
                    const iconContainer = document.createElement('div');
                    iconContainer.className = 'item-icon';
                    
                    if (item.icon.startsWith('fa-')) {
                        const prefix = (item.icon.includes('code') || item.icon.includes('terminal') || item.icon.includes('solid')) ? 'fas' : 'fa-brands';
                        iconContainer.innerHTML = `<i class="${prefix} ${item.icon}"></i>`;
                    } else {
                        const img = document.createElement('img');
                        img.src = item.icon;
                        img.alt = item.label;
                        img.onerror = () => { img.style.display = 'none'; iconContainer.innerHTML = '<i class="fas fa-circle"></i>'; }; 
                        iconContainer.appendChild(img);
                    }
                    itemEl.appendChild(iconContainer);
                }

                const labelContainer = document.createElement('div');
                labelContainer.className = 'label-container';
                labelContainer.style.display = 'flex';
                labelContainer.style.flexDirection = 'column';
                labelContainer.style.justifyContent = 'center';

                const label = document.createElement('span');
                label.className = 'item-label';
                label.textContent = item.label;
                labelContainer.appendChild(label);

                if (item.title) {
                    const subLabel = document.createElement('span');
                    subLabel.className = 'item-sublabel';
                    subLabel.textContent = item.title;
                    subLabel.style.fontSize = '0.75rem';
                    subLabel.style.opacity = '0.8';
                    labelContainer.appendChild(subLabel);
                }
                
                itemEl.appendChild(labelContainer);

                let tooltipText = `${item.label}`;
                if (item.title) tooltipText += ` - ${item.title}`;
                tooltipText += ` (${item.start.getFullYear()} - ${item.end.getFullYear() === new Date().getFullYear() && item.end.getMonth() === new Date().getMonth() ? 'Present' : item.end.getFullYear()})`;
                
                itemEl.title = tooltipText;

                trackContainer.appendChild(itemEl);
            }
        });

        sectionEl.appendChild(trackContainer);
        container.appendChild(sectionEl);
    });
}
