async function igvBrowser(bamUrl = null, locs = null, genome = "hg38", ) {
    bamUrl = await urlExists(bamUrl) ? bamUrl : "https://s3.amazonaws.com/1000genomes/data/HG00103/alignment/HG00103.alt_bwamem_GRCh38DH.20150718.GBR.low_coverage.cram";

    if (locs == null) {
        locs = "1:1000000-1001000";
    }

    if (bamUrl.endsWith('.cram')) {
        baiUrl = bamUrl + '.crai';
    } else {
        baiUrl = bamUrl + '.bai';
    }

    if (!await urlExists(baiUrl)) {
        alert("The BAM/CRAM file does not have an index file (.bai/.crai).");
        return;
    }

    const div = document.getElementById("igvContainer");
    const options = {
        genome: genome,
        locus: locs, // Setting the initial location
        tracks: [{
            name: "HG00103",
            url: bamUrl,
            indexURL: baiUrl,
            format: bamUrl.endsWith('.cram') ? 'cram' : 'bam' // Adjusting format based on file extension
        }]
    };

    igv.createBrowser(div, options)
        .then(function(browser) {
            console.log("IGV browser is initialized.");
        });
}

// You can use this function to check if the URL exists or if it's a valid local file
async function urlExists(url) {
    if (!url) return false;
    // If it's a local file, check if it's accessible by trying to fetch it
    if (url.startsWith("file://")) {
        try {
            const response = await fetch(url);
            return response && response.ok;
        } catch (error) {
            return false;
        }
    }

    return true;
}

function loadBAMFiles() {
    const bamFileInput = document.getElementById('bamFileInput');
    const selectedFileName = document.getElementById('selectedFileName');

    if (fileInput.files[0]) {
        selectedFileName.textContent = `Selected: ${fileInput.files[0].name}`;
    } else {
        selectedFileName.textContent = '';
    }

    if (bamFileInput.files.length > 0) {
        const bamUrl = URL.createObjectURL(bamFileInput.files[0]);



        igvBrowser(bamUrl);
    }
}

igvBrowser();