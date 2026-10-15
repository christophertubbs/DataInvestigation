"""Create representative viewer fixtures using optional conda scientific test packages.

Development only: numpy, scipy, h5py, pyarrow; none are required to deploy viewer.html.
Usage: python tests/viewer-create-fixtures.py /path/to/viewer-tools
Expected Parquet: count 100003, sum(value) 4242816; null every seventh row, UTC timestamps,
int64, double, UTF-8/category and boolean physical/logical types, Snappy, 10k row groups.
Packed arrays: raw [0,2,-9999,6,8,10,12,14,16,18,20,22], scale 0.5, offset 10,
fill -9999; expected [10,11,None,13,14,15,16,17,18,19,20,21].
TODO(AI-REVIEW): AI-authored fixture generator; verify file semantics and expected values.
"""

import argparse
import json
from pathlib import Path

import h5py
import numpy as np
import pyarrow as pa
import pyarrow.parquet as pq
from scipy.io import netcdf_file

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("directory", type=Path, help="Temporary viewer tooling/fixture directory")
arguments = parser.parse_args()
directory = arguments.directory
directory.mkdir(parents=True, exist_ok=True)

identifiers = np.arange(100003, dtype=np.int64)
values = pa.array([None if index % 7 == 0 else float(index % 100) for index in identifiers], type=pa.float64())
table = pa.table({
    "id": pa.array(identifiers),
    "value": values,
    "time": pa.array(identifiers * 1000, type=pa.timestamp("ms", tz="UTC")),
    "category": pa.array(["A" if index % 2 == 0 else "B" for index in identifiers]),
    "flag": pa.array(identifiers % 2 == 0),
})
pq.write_table(table, directory / "viewer-fixture.parquet", compression="snappy", row_group_size=10000)

raw = np.array([0, 2, -9999, 6, 8, 10, 12, 14, 16, 18, 20, 22], dtype=np.int16).reshape(1, 3, 4)
with netcdf_file(directory / "viewer-fixture.nc", "w") as classic:
    classic.createDimension("time", 1)
    classic.createDimension("y", 3)
    classic.createDimension("x", 4)
    variable = classic.createVariable("temperature", "h", ("time", "y", "x"))
    variable.units = "K"
    variable.scale_factor = np.float32(0.5)
    variable.add_offset = np.float32(10)
    variable._FillValue = np.int16(-9999)
    variable[:] = raw
with h5py.File(directory / "viewer-fixture.h5", "w") as hdf:
    variable = hdf.create_dataset("temperature", data=raw, compression="gzip", chunks=(1, 3, 4))
    variable.attrs["units"] = "K"
    variable.attrs["scale_factor"] = 0.5
    variable.attrs["add_offset"] = 10.0
    variable.attrs["_FillValue"] = -9999
    variable.attrs["_ARRAY_DIMENSIONS"] = ["time", "y", "x"]

store = directory / "viewer-local.zarr"
store.mkdir(exist_ok=True)
(store / ".zarray").write_text(json.dumps({
    "zarr_format": 2, "shape": [2, 3], "chunks": [2, 3], "dtype": "<f8",
    "compressor": None, "fill_value": None, "order": "C", "filters": None,
}), encoding="utf-8")
(store / ".zattrs").write_text(json.dumps({"_ARRAY_DIMENSIONS": ["y", "x"]}), encoding="utf-8")
(store / "0.0").write_bytes(np.arange(6, dtype="<f8").tobytes())
print("Created viewer Parquet, NetCDF3, compressed HDF5 and local Zarr fixtures.")
