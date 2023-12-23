async function igvBrowser(
    bamUrl = null,
    locs = "1:1000000-1001000",
    genome = "hg38",
) {
    bamUrl = bamUrl
        ? bamUrl
        : "https://s3.amazonaws.com/1000genomes/data/HG00103/alignment/HG00103.alt_bwamem_GRCh38DH.20150718.GBR.low_coverage.cram";

    if (bamUrl.endsWith(".cram")) {
        baiUrl = bamUrl + ".crai";
    } else {
        baiUrl = bamUrl + ".bai";
    }

    const div = document.getElementById("igvContainer");
    const options = {
        genome: genome,
        locus: locs, // Setting the initial location
        tracks: [
            {
                name: "HG00103",
                url: bamUrl,
                indexURL: baiUrl,
                format: bamUrl.endsWith(".cram") ? "cram" : "bam", // Adjusting format based on file extension
            },
        ],
    };

    igv.createBrowser(div, options).then(function(browser) {
        console.log("IGV browser is initialized.");
    });
}

function loadBAMFiles() {
    const bamFileInput = document.getElementById("bamFileInput");
    const selectedFileName = document.getElementById("selectedFileName");

    if (fileInput.files[0]) {
        selectedFileName.textContent = `Selected: ${fileInput.files[0].name}`;
    } else {
        selectedFileName.textContent = "";
    }

    if (bamFileInput.files.length > 0) {
        const bamUrl = URL.createObjectURL(bamFileInput.files[0]);

        igvBrowser(bamUrl);
    }
}

igvBrowser();
