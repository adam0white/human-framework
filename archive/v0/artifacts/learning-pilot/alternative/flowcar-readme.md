# About Flowcar

Repository for 2017 + 2019 experiments on Flow using Cogcarsim steering task.

# Replication

This section contains the instructions for rerunning the analysis pipeline for the paper "The Link Between Flow and Performance is Moderated by Task Experience"

## Paper authors
Jussi Palomäki, Tuisku Tammi, Noora Lehtonen, Niina Peltonen, Sami Abuhamdeh, Otto Lappi, Benjamin Ultan Cowley

## Code authors
Jussi Palomäki, Tuisku Tammi, Benjamin Ultan Cowley

## Instructions

### One-shot Rmd
Download all files from the [Figshare object here](https://doi.org/10.6084/m9.figshare.13567409), and follow the instructions there. Or:

### R code
There are two ways to run through the analysis pipeline:

1) Navigate to Analyses/flowcar/R and open and run the Rmarkdown file "cogcarsim_analyses.Rmd". This file first (hiddenly) runs the code in the "combine_data.R", "znbnUtils.R" and "znbnVisuals.R" files ("combine.data.R" contains the code for wrangling and compiling the data for use in the analyses, while "znbnUtils.R" and "znbnVisuals.R" contain further necessary functions). Then, it (openly) runs the code in the "cogcarsim_analyses.R" file, which reproduces the analyses and figures of the main article as well as the Appendix. The "cogcarsim_analyses.Rmd" file can be "knitted" into an html file, which is already available in the R folder ("cogcarsim_analyses.html"). This html file can be opened and navigated in any up-to-date web browser, but the figures may have poorly defined aspect ratios (please confer the actual article for properly formatted figures).

2) Open and run all the code in the following files, in this order: i) "combine_data.R", ii) "znbnUtils.R" and "znbnVisuals.R", iii) "cogcarsim_analyses.R".

Everything works out-of-the-box as long as all files are in the correct folders to begin with (as they are currently in the Github repo). If you break the product, you get to keep both pieces. Note that a large number of different R libraries are used, all of which need to be installed for the code to work correctly. Note also that the "figures" folder is empty, and remains empty after running the pipeline as it currently is. To export figures, uncomment the corresponding lines of code (e.g. line 116: #ggsave("figure4.pdf", width=12, height=6)).
